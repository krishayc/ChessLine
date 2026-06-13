import chess
import chess.engine

# Point this at your Stockfish file
engine = chess.engine.SimpleEngine.popen_uci("./stockfish-macos-m1-apple-silicon")

# This is the starting position of a chess game
board = chess.Board()

# Ask Stockfish for the best move, giving it 1 second to think
result = engine.play(board, chess.engine.Limit(time=1.0))

print("Best move:", result.move)

engine.quit()