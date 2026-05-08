using PuzzleGame.Server.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. SignalR servisini ekle
builder.Services.AddSignalR();

// 2. CORS Ayarları (React'in çalışacağı adrese izin ver)
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // React genelde bu portta çalışır (Vite)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // SignalR için bu zorunludur!
    });
});

var app = builder.Build();

// 3. CORS politikasını kullan
app.UseCors("ReactPolicy");

// 4. Hub rotasını belirle
app.MapHub<PuzzleHub>("/puzzleHub");

app.MapGet("/", () => "Puzzle Sunucusu Çalışıyor!");

app.Run();