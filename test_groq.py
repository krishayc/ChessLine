import os
import chess
import chess.engine
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Start Stockfish
engine = chess.engine.SimpleEngine.popen_uci("./stockfish-macos-m1-apple-silicon")

# Starting position
board = chess.Board()

# Get best move from Stockfish
result = engine.play(board, chess.engine.Limit(time=1.0))
best_move = result.move
print("Best move:", best_move)

engine.quit()

# Ask Groq to explain the move
response = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[
        {
            "role": "user",
            "content": f"We are at the starting position of a chess game. Stockfish recommends the move {best_move}. In 1 sentence, explain why this is a strong opening move. Use plain and human English, no jargon, as if explaining to a beginner."
        }
    ]
)

print("\nExplanation:")
print(response.choices[0].message.content)