import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Image as KonvaImage, Rect } from 'react-konva';
import Confetti from 'react-confetti';
import useImage from 'use-image';
import * as signalR from '@microsoft/signalr';

// --- SABİTLER ---
const AVAILABLE_IMAGES = [
    { id: 15, name: 'Şelale', url: 'https://picsum.photos/id/15/200/150' },
    { id: 10, name: 'Orman', url: 'https://picsum.photos/id/10/200/150' },
    { id: 28, name: 'Orman Evi', url: 'https://picsum.photos/id/28/200/150' },
    { id: 54, name: 'Dağlar', url: 'https://picsum.photos/id/54/200/150' },
    { id: 57, name: 'Kale', url: 'https://picsum.photos/id/57/200/150' },
    { id: 76, name: 'Kulübe', url: 'https://picsum.photos/id/76/200/150' },
];

const HUB_URL = "http://localhost:5135/puzzleHub";

// --- PARÇA ÇİZİM FONKSİYONU ---
const drawJigsawPiece = (ctx, width, height, edges) => {
    const { top, right, bottom, left } = edges;
    const w = width; const h = height;
    const tabHeight = Math.min(w, h) * 0.25; const neckWidth = Math.min(w, h) * 0.20;
    ctx.beginPath(); ctx.moveTo(0, 0);
    if (top === 0) ctx.lineTo(w, 0); else { const sign = top; ctx.lineTo((w - neckWidth) / 2, 0); ctx.bezierCurveTo((w - neckWidth) / 2, sign * tabHeight * 0.2, w / 2 - neckWidth * 0.8, sign * tabHeight, w / 2, sign * tabHeight); ctx.bezierCurveTo(w / 2 + neckWidth * 0.8, sign * tabHeight, (w + neckWidth) / 2, sign * tabHeight * 0.2, (w + neckWidth) / 2, 0); ctx.lineTo(w, 0); }
    if (right === 0) ctx.lineTo(w, h); else { const sign = right; ctx.lineTo(w, (h - neckWidth) / 2); ctx.bezierCurveTo(w + sign * tabHeight * 0.2, (h - neckWidth) / 2, w + sign * tabHeight, h / 2 - neckWidth * 0.8, w + sign * tabHeight, h / 2); ctx.bezierCurveTo(w + sign * tabHeight, h / 2 + neckWidth * 0.8, w + sign * tabHeight * 0.2, (h + neckWidth) / 2, w, (h + neckWidth) / 2); ctx.lineTo(w, h); }
    if (bottom === 0) ctx.lineTo(0, h); else { const sign = -bottom; ctx.lineTo((w + neckWidth) / 2, h); ctx.bezierCurveTo((w + neckWidth) / 2, h + sign * tabHeight * 0.2, w / 2 + neckWidth * 0.8, h + sign * tabHeight, w / 2, h + sign * tabHeight); ctx.bezierCurveTo(w / 2 - neckWidth * 0.8, h + sign * tabHeight, (w - neckWidth) / 2, h + sign * tabHeight * 0.2, (w - neckWidth) / 2, h); ctx.lineTo(0, h); }
    if (left === 0) ctx.lineTo(0, 0); else { const sign = -left; ctx.lineTo(0, (h + neckWidth) / 2); ctx.bezierCurveTo(sign * tabHeight * 0.2, (h + neckWidth) / 2, sign * tabHeight, h / 2 + neckWidth * 0.8, sign * tabHeight, h / 2); ctx.bezierCurveTo(sign * tabHeight, h / 2 - neckWidth * 0.8, sign * tabHeight * 0.2, (h - neckWidth) / 2, 0, (h - neckWidth) / 2); ctx.lineTo(0, 0); }
    ctx.closePath();
};

const PuzzleGame = () => {
    const [username, setUsername] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);

    const [currentImageId, setCurrentImageId] = useState(15);
    const [image] = useImage(`https://picsum.photos/id/${currentImageId}/1000/750`);
    const [votes, setVotes] = useState({});
    const [pieces, setPieces] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [puzzleCompleted, setPuzzleCompleted] = useState(false);

    const connectionRef = useRef(null);

    // --- LAYOUT BOYUTLARI ---
    const headerHeight = 60;
    const sidebarWidth = 250;
    const stageWidth = window.innerWidth - sidebarWidth;
    const stageHeight = window.innerHeight - headerHeight;

    const SNAP_DISTANCE = 20;

    // --- OYUNA GİRİŞ ---
    const joinGame = async () => {
        if (!username.trim()) return alert("Lütfen bir isim gir!");
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL)
            .withAutomaticReconnect()
            .build();

        try {
            await newConnection.start();
            await newConnection.invoke("JoinGame", username);
            setIsLoggedIn(true);

            newConnection.on("UpdateLeaderboard", (players) => setLeaderboard(players));
            newConnection.on("ReceiveVoteUpdate", (updatedVotes) => setVotes(updatedVotes));
            newConnection.on("ReceivePuzzleState", (serverPieces, rows, cols, serverImageId) => {
                setCurrentImageId(serverImageId);
                const pieceWidth = 1000 / cols; const pieceHeight = 750 / rows;

                // Müşteri Tarafında Ortalama (Centering) Ofsetleri
                const currentStageWidth = window.innerWidth - 250; // sidebarWidth
                const currentStageHeight = window.innerHeight - 60; // headerHeight
                const offsetX = Math.max(0, (currentStageWidth - 1000) / 2);
                const offsetY = Math.max(0, (currentStageHeight - 750) / 2);

                const mappedPieces = serverPieces.map(p => ({
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    solvedX: p.solvedX + offsetX,
                    solvedY: p.solvedY + offsetY,
                    width: pieceWidth, height: pieceHeight,
                    edges: { top: p.top, right: p.right, bottom: p.bottom, left: p.left },
                    origX: parseInt(p.id.split('-')[1]) * pieceWidth,
                    origY: parseInt(p.id.split('-')[0]) * pieceHeight,
                    isLocked: p.isLocked
                }));
                setPieces(mappedPieces);
                setGameStarted(true);
            });
            newConnection.on("ReceivePieceMove", (pieceId, x, y, isLocked) => {
                setPieces((prev) => prev.map((p) => p.id === pieceId ? { ...p, x, y, isLocked } : p));
            });
            connectionRef.current = newConnection;
        } catch (e) { console.error("Bağlantı hatası:", e); }
    };

    const handleLogout = async () => {
        if (connectionRef.current) { await connectionRef.current.stop(); connectionRef.current = null; }
        setIsLoggedIn(false); setGameStarted(false); setPieces([]); setLeaderboard([]); setVotes({}); setPuzzleCompleted(false);
    };

    const sendVote = async (imageId) => { if (connectionRef.current) await connectionRef.current.invoke("VoteForImage", imageId); };
    const startGame = async (difficulty) => {
        setPuzzleCompleted(false);
        if (connectionRef.current) await connectionRef.current.invoke("StartGame", difficulty);
    };

    const handleDragStart = (e) => {
        const id = e.target.attrs.name;
        const item = pieces.find(i => i.id === id);
        if (item && !item.isLocked) {
            const items = pieces.slice(); items.splice(items.indexOf(item), 1); items.push(item);
            setPieces(items);
        }
    };

    const handleDragEnd = async (e, id) => {
        let { x, y } = e.target.attrs;
        const piece = pieces.find(p => p.id === id);
        const isClose = Math.abs(x - piece.solvedX) < SNAP_DISTANCE && Math.abs(y - piece.solvedY) < SNAP_DISTANCE;

        if (isClose) {
            x = piece.solvedX; y = piece.solvedY;
            e.target.position({ x: x, y: y }); e.target.draggable(false);

            setPieces(prev => {
                const nextPieces = prev.map(p => p.id === id ? { ...p, x, y, isLocked: true } : p);
                if (nextPieces.every(p => p.isLocked)) {
                    setPuzzleCompleted(true);
                }
                return nextPieces;
            });

            if (connectionRef.current) await connectionRef.current.invoke("MovePiece", id, x, y);
        } else {
            setPieces(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
            if (connectionRef.current) await connectionRef.current.invoke("MovePiece", id, x, y);
        }
    };

    // --- GİRİŞ EKRANI ---
    if (!isLoggedIn) {
        return (
            <div style={{ height: '100vh', background: '#222', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
                <h1 style={{ color: '#f1c40f', fontSize: '3rem' }}>Puzzle Arena</h1>
                <input type="text" placeholder="Adınız nedir?" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && joinGame()} style={{ padding: '15px', fontSize: '18px', borderRadius: '5px', border: 'none', marginBottom: '20px', width: '250px' }} />
                <button onClick={joinGame} style={btnStyle('#3498db')}>OYUNA GİR</button>
            </div>
        );
    }

    // --- ANA OYUN DÜZENİ ---
    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* 1. ÜST BAR */}
            <div style={{
                height: `${headerHeight}px`, backgroundColor: '#34495e', color: 'white',
                display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)', zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h2 style={{ margin: 0, color: '#f1c40f' }}>Puzzle Arena</h2>
                    <span style={{ fontSize: '14px', color: '#bdc3c7' }}>Oyuncu: <b>{username}</b></span>
                </div>
                <button onClick={handleLogout} style={{ padding: '8px 20px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ÇIKIŞ YAP</button>
            </div>

            {/* 2. ORTA BÖLÜM */}
            <div style={{ flex: 1, display: 'flex' }}>

                {/* A. SOL - OYUN ALANI */}
                <div style={{ flex: 1, backgroundColor: '#2c3e50', position: 'relative', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', borderRight: '2px solid #222', overflow: 'hidden' }}>
                    {!gameStarted && (
                        <div style={{ position: 'absolute', zIndex: 100, width: '100%', height: '100%', backgroundColor: 'rgba(20, 20, 30, 0.95)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <h2>Resim Oylaması</h2>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {AVAILABLE_IMAGES.map((img) => (
                                    <div key={img.id} onClick={() => sendVote(img.id)} style={{ position: 'relative', border: '2px solid #555', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' }}
                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                        <img src={img.url} alt={img.name} style={{ display: 'block', width: '150px', height: '100px', objectFit: 'cover', opacity: 0.8 }} />
                                        <div style={{ position: 'absolute', top: 5, right: 5, backgroundColor: votes[img.id] ? '#2ecc71' : '#555', color: 'white', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>{votes[img.id] || 0}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                    <button onClick={() => startGame(1)} style={btnStyle('#2ecc71')}>KOLAY</button>
                                    <span style={{ fontSize: '12px', color: '#bdc3c7' }}>100 Parça</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                    <button onClick={() => startGame(2)} style={btnStyle('#e67e22')}>ORTA</button>
                                    <span style={{ fontSize: '12px', color: '#bdc3c7' }}>250 Parça</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                    <button onClick={() => startGame(3)} style={btnStyle('#e74c3c')}>ZOR</button>
                                    <span style={{ fontSize: '12px', color: '#bdc3c7' }}>500 Parça</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {gameStarted && !image && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>Resim Yükleniyor...</div>}

                    <Stage width={stageWidth} height={stageHeight}>
                        <Layer>
                            {gameStarted && pieces.length > 0 && (
                                <Rect
                                    x={pieces[0].solvedX - pieces[0].origX}
                                    y={pieces[0].solvedY - pieces[0].origY}
                                    width={1000}
                                    height={750}
                                    stroke="rgba(255, 255, 255, 0.4)"
                                    strokeWidth={2}
                                    dash={[10, 5]}
                                    fill="rgba(0, 0, 0, 0.2)"
                                    shadowColor="black"
                                    shadowBlur={10}
                                    shadowOpacity={0.5}
                                />
                            )}
                            {pieces.map((piece) => (
                                <Group key={piece.id} name={piece.id} x={piece.x} y={piece.y}
                                    draggable={!piece.isLocked} onDragStart={handleDragStart} onDragEnd={(e) => handleDragEnd(e, piece.id)}
                                    clipFunc={(ctx) => drawJigsawPiece(ctx, piece.width, piece.height, piece.edges)}
                                    onMouseEnter={(e) => !piece.isLocked && (e.target.getStage().container().style.cursor = 'grab')}
                                    onMouseLeave={(e) => e.target.getStage().container().style.cursor = 'default'}
                                    onMouseDown={(e) => !piece.isLocked && (e.target.getStage().container().style.cursor = 'grabbing')}
                                    onMouseUp={(e) => !piece.isLocked && (e.target.getStage().container().style.cursor = 'grab')}
                                >
                                    <KonvaImage image={image} x={-piece.origX} y={-piece.origY} width={1000} height={750} perfectDrawEnabled={false} stroke={piece.isLocked ? null : "black"} strokeWidth={piece.isLocked ? 0 : 1} />
                                </Group>
                            ))}
                        </Layer>
                    </Stage>
                </div>

                {/* B. SAĞ PANEL - SKOR */}
                <div style={{ width: `${sidebarWidth}px`, backgroundColor: '#ecf0f1', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '5px solid #bdc3c7' }}>

                    {gameStarted && (
                        <div onClick={() => setShowPreview(true)} style={{ background: 'white', padding: '5px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            <p style={{ margin: '0 0 5px 0', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>Referans (Büyüt)</p>
                            <img src={`https://picsum.photos/id/${currentImageId}/200/150`} width="100%" style={{ borderRadius: 4, display: 'block' }} />
                        </div>
                    )}

                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flex: 1 }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', textAlign: 'center', borderBottom: '2px solid #f1c40f', paddingBottom: '10px', color: '#2c3e50' }}>SKOR TABLOSU</h3>
                        {leaderboard.map((player, index) => (
                            <div key={player.id} style={{
                                display: 'flex', justifyContent: 'space-between', padding: '8px', marginBottom: '5px', borderRadius: '4px',
                                backgroundColor: player.name === username ? '#f1c40f' : '#ecf0f1',
                                // DÜZELTME BURADA: Eğer kendi adınsa (Sarı) yazı BEYAZ, değilse (Gri) yazı KOYU RENK
                                color: player.name === username ? 'white' : '#2c3e50',
                                fontWeight: player.name === username ? 'bold' : 'normal'
                            }}>
                                <span>{index + 1}. {player.name}</span>
                                <span>{player.score}</span>
                            </div>
                        ))}
                        {leaderboard.length === 0 && <p style={{ textAlign: 'center', fontSize: '12px', color: 'gray' }}>Bekleniyor...</p>}
                    </div>
                </div>
            </div>

            {showPreview && (
                <div onClick={() => setShowPreview(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
                    <img src={`https://picsum.photos/id/${currentImageId}/1000/750`} style={{ maxWidth: '90%', boxShadow: '0 0 20px black' }} />
                </div>
            )}

            {puzzleCompleted && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} gravity={0.15} />
                    <div style={{ backgroundColor: '#2c3e50', padding: '40px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 0 30px rgba(0,0,0,0.5)', border: '2px solid #f1c40f' }}>
                        <h1 style={{ color: '#f1c40f', fontSize: '3rem', margin: '0 0 10px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>TEBRİKLER!</h1>
                        <h2 style={{ color: 'white', margin: '0 0 30px 0' }}>Puzzle'ı başarıyla tamamladınız!</h2>
                        <button onClick={() => { setGameStarted(false); setPuzzleCompleted(false); }} style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#27ae60', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>Menüye Dön & Tekrar Oyna</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const btnStyle = (color) => ({ padding: '10px 20px', fontSize: '14px', cursor: 'pointer', backgroundColor: color, border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold' });

export default PuzzleGame;