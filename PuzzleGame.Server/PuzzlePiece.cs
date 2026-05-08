namespace PuzzleGame.Server
{
    public class PuzzlePiece
    {
        public string Id { get; set; }
        public double X { get; set; }
        public double Y { get; set; }
        public double SolvedX { get; set; } // Parçanın olması gereken x yeri
        public double SolvedY { get; set; } // Parçanın olması gereken y yeri
        
        // Kenar Tipleri (1: Çıkıntı, -1: Girinti, 0: Düz)
        public int Top { get; set; }
        public int Right { get; set; }
        public int Bottom { get; set; }
        public int Left { get; set; }
        
        public bool IsLocked { get; set; }
    }
}