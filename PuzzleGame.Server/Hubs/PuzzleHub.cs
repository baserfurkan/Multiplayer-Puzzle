using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PuzzleGame.Server.Hubs
{
    public class PuzzleHub : Hub
    {
        // OYUNCU BİLGİSİ SINIFI
        public class PlayerInfo
        {
            public string Id { get; set; } // ConnectionId
            public string Name { get; set; }
            public int Score { get; set; }
        }

        // HAFIZA
        private static List<PuzzlePiece> CurrentPieces = new List<PuzzlePiece>();
        private static Dictionary<int, int> _imageVotes = new Dictionary<int, int>();
        
        // --- YENİ: OYUNCU LİSTESİ ---
        private static Dictionary<string, PlayerInfo> _players = new Dictionary<string, PlayerInfo>();
        private static Dictionary<string, int> _playerVotes = new Dictionary<string, int>();

        private static int CurrentRows = 4;
        private static int CurrentCols = 5;
        private static int CurrentImageId = 15;
        private const double ImageWidth = 1000;
        private const double ImageHeight = 750;

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Oyuncu çıkarsa listeden sil
            if (_players.ContainsKey(Context.ConnectionId))
            {
                _players.Remove(Context.ConnectionId);
                // Eğer oyuncunun bir oyu varsa, oyu geri al
                if (_playerVotes.ContainsKey(Context.ConnectionId))
                {
                    int votedImageId = _playerVotes[Context.ConnectionId];
                    if (_imageVotes.ContainsKey(votedImageId))
                    {
                        _imageVotes[votedImageId]--;
                        if (_imageVotes[votedImageId] <= 0) _imageVotes.Remove(votedImageId);
                    }
                    _playerVotes.Remove(Context.ConnectionId);
                    await Clients.All.SendAsync("ReceiveVoteUpdate", _imageVotes);
                }
                
                // Kalanlara güncel listeyi gönder
                await Clients.All.SendAsync("UpdateLeaderboard", _players.Values.OrderByDescending(p => p.Score).ToList());
            }
            await base.OnDisconnectedAsync(exception);
        }

        // --- YENİ: OYUNA GİRİŞ (İSİM KAYDETME) ---
        public async Task JoinGame(string userName)
        {
            if (!_players.ContainsKey(Context.ConnectionId))
            {
                _players[Context.ConnectionId] = new PlayerInfo 
                { 
                    Id = Context.ConnectionId, 
                    Name = userName, 
                    Score = 0 
                };
            }

            // Girene mevcut durumu yolla
            await Clients.Caller.SendAsync("ReceiveVoteUpdate", _imageVotes);
            if (CurrentPieces.Count > 0)
            {
                await Clients.Caller.SendAsync("ReceivePuzzleState", CurrentPieces, CurrentRows, CurrentCols, CurrentImageId);
            }

            // Herkese güncel oyuncu listesini yolla (Skor tablosu için)
            await Clients.All.SendAsync("UpdateLeaderboard", _players.Values.OrderByDescending(p => p.Score).ToList());
        }

        public async Task VoteForImage(int imageId)
        {
            string connectionId = Context.ConnectionId;
            
            // Eğer daha önceden oy kullanılmışsa, eski oyu düş
            if (_playerVotes.ContainsKey(connectionId))
            {
                int previousVote = _playerVotes[connectionId];
                if (previousVote == imageId) return; // Aynı şeye tekrar oy veriyorsa bir şey yapma
                
                if (_imageVotes.ContainsKey(previousVote))
                {
                    _imageVotes[previousVote]--;
                    if (_imageVotes[previousVote] <= 0) _imageVotes.Remove(previousVote);
                }
            }
            
            // Yeni oyu kaydet
            _playerVotes[connectionId] = imageId;
            
            if (!_imageVotes.ContainsKey(imageId)) _imageVotes[imageId] = 0;
            _imageVotes[imageId]++;
            
            await Clients.All.SendAsync("ReceiveVoteUpdate", _imageVotes);
        }

        public async Task StartGame(int difficultyLevel)
        {
            if (_imageVotes.Count > 0)
                CurrentImageId = _imageVotes.OrderByDescending(x => x.Value).First().Key;
            else
                CurrentImageId = 15;

            switch (difficultyLevel)
            {
                case 1: CurrentRows = 10; CurrentCols = 10; break; // 100 parça
                case 2: CurrentRows = 10; CurrentCols = 25; break; // 250 parça
                case 3: CurrentRows = 20; CurrentCols = 25; break; // 500 parça
                default: CurrentRows = 10; CurrentCols = 10; break;
            }

            GeneratePuzzle();
            _imageVotes.Clear();
            _playerVotes.Clear(); // Oyları tamamen sıfırla
            
            // Tüm oyuncuların puanlarını sıfırla!
            foreach(var p in _players.Values) p.Score = 0;

            await Clients.All.SendAsync("ReceivePuzzleState", CurrentPieces, CurrentRows, CurrentCols, CurrentImageId);
            await Clients.All.SendAsync("ReceiveVoteUpdate", _imageVotes);
            await Clients.All.SendAsync("UpdateLeaderboard", _players.Values.ToList());
        }

        // --- GÜNCELLENDİ: PUAN HESAPLAMA ---
public async Task MovePiece(string pieceId, double x, double y)
{
    var piece = CurrentPieces.FirstOrDefault(p => p.Id == pieceId);
    
    // Eğer parça zaten kilitliyse işlem yapma (Hareket etmesin)
    if (piece == null || piece.IsLocked) return;

    // Sunucu tarafı mıknatıs kontrolü
    if (Math.Abs(x - piece.SolvedX) < 20 && Math.Abs(y - piece.SolvedY) < 20)
    {
        // KİLİTLE
        piece.IsLocked = true;
        piece.X = piece.SolvedX; // Tam konuma sabitle
        piece.Y = piece.SolvedY;

        // Puan ver
        if (_players.ContainsKey(Context.ConnectionId))
        {
            _players[Context.ConnectionId].Score += 10;
            await Clients.All.SendAsync("UpdateLeaderboard", _players.Values.OrderByDescending(p => p.Score).ToList());
        }
    }
    else
    {
        // Kilitlenmediyse konumu güncelle
        piece.X = x;
        piece.Y = y;
    }

    // Locked bilgisini de gönderiyoruz (Frontend bunu işliyor zaten)
    await Clients.Others.SendAsync("ReceivePieceMove", pieceId, piece.X, piece.Y, piece.IsLocked);
}
        private void GeneratePuzzle()
        {
            CurrentPieces.Clear();
            var rand = new Random();
            double pieceWidth = ImageWidth / CurrentCols;
            double pieceHeight = ImageHeight / CurrentRows;
            var edgeMap = new dynamic[CurrentRows, CurrentCols];

            for (int i = 0; i < CurrentRows; i++)
            {
                for (int j = 0; j < CurrentCols; j++)
                {
                    int top = (i == 0) ? 0 : -edgeMap[i - 1, j].Bottom;
                    int left = (j == 0) ? 0 : -edgeMap[i, j - 1].Right;
                    int right = (j == CurrentCols - 1) ? 0 : (rand.NextDouble() > 0.5 ? 1 : -1);
                    int bottom = (i == CurrentRows - 1) ? 0 : (rand.NextDouble() > 0.5 ? 1 : -1);
                    edgeMap[i, j] = new { Top = top, Right = right, Bottom = bottom, Left = left };

                    CurrentPieces.Add(new PuzzlePiece
                    {
                        Id = $"{i}-{j}",
                        X = rand.NextDouble() * (1200 - pieceWidth), // Genişlik değişmedi çünkü oyuncuya parçaların dağılacağı ekstra bir alan lazım
                        Y = rand.NextDouble() * (800 - pieceHeight), 
                        SolvedX = j * pieceWidth,
                        SolvedY = i * pieceHeight,
                        Top = top, Right = right, Bottom = bottom, Left = left,
                        IsLocked = false
                    });
                }
            }
        }
    }
}