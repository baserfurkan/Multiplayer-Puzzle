# Puzzle Arena - Real-Time Multiplayer Jigsaw Game

Puzzle Arena, arkadaşlarınızla aynı odaya girip **eşzamanlı olarak** ve rekabet içinde çözebileceğiniz, gerçek zamanlı bir çok oyunculu yapboz (jigsaw puzzle) oyunudur. 

Geleneksel DOM elemanları yerine **HTML5 Canvas** (Konva.js) kullanılarak 1000 parçaya kadar yüksek performanslı render hedeflenmiş ve **SignalR** ile milisaniyelik senkronizasyon sağlanmıştır.

- **Gerçek Zamanlı Çok Oyunculu Deneyim:** Bir oyuncu parçayı hareket ettirdiğinde, diğer tüm oyuncularda anlık olarak senkronize olur.
- **Demokratik Lobi Sistemi:** Oyuncular oynamak istedikleri referans resme oy verir. En çok oyu alan resim oyun haritası olarak seçilir.
- **Dinamik Zorluk Seviyeleri:** - Kolay (20 Parça)
  - Orta (80 Parça)
  - Zor (300+ Parça)
- **Matematiksel Parça Üretimi:** Parçalar önceden kesilmiş görseller değildir. İstemci tarafında **Bézier Eğrileri** kullanılarak algoritmik olarak birbirine tam geçen (Jigsaw) şekiller oluşturulur.
- **Canlı Skor Tablosu & Rekabet:** Parçayı doğru koordinata ("tak" sesiyle) kilitleyen oyuncu anında puan kazanır ve skor tablosu canlı güncellenir.
- **Performanslı Rendering:** React Konva ile sanal Canvas katmanları oluşturularak, yüzlerce parçada bile tarayıcının kasması (DOM overhead) engellenmiştir.

## Teknolojiler

Bu proje iki ana mimariden oluşmaktadır:

**Frontend (İstemci):**
- **React (Vite):** Hızlı geliştirme ve UI katmanı.
- **React Konva (Canvas):** Oyun motoru ve 2D render işlemleri.
- **@microsoft/signalr:** Gerçek zamanlı WebSocket iletişimi.
- **use-image:** Canvas içi asenkron resim yükleme yönetimi.

**Backend (Sunucu):**
- **C# / .NET Core Web API:** Sunucu altyapısı.
- **SignalR (Hub):** Oyuncu odaları, bağlantı yönetimi, anlık koordinat yayını ve oy tablosu senkronizasyonu.

## Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

### 1. Backend'i Başlatma (.NET)

```bash
# Backend klasörüne gidin
cd PuzzleGame.Server

# Projeyi derleyip çalıştırın
dotnet watch run
```

### 2. Backend'i Başlatma (.NET)

```bash
cd puzzle-game

# Gerekli kütüphaneleri yükleyin
npm install

# (Önemli) src/App.jsx içindeki HUB_URL adresini kendi backend portunuza göre güncelleyin.
# Örn: const HUB_URL = "http://localhost:5135/puzzleHub";

# Geliştirme sunucusunu başlatın
npm run dev
```