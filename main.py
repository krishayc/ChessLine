import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import chess.engine
from groq import Groq

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@app.route("/analyse", methods=["POST"])
def analyse():
    data = request.get_json()
    fen = data.get("fen")

    board = chess.Board(fen)

    engine = chess.engine.SimpleEngine.popen_uci("./stockfish-macos-m1-apple-silicon")
    result = engine.play(board, chess.engine.Limit(time=1.0))
    best_move = result.move
    engine.quit()

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "user",
                "content": f"In a chess game, Stockfish recommends the move {best_move} from this position. In 1 sentence, explain why this is a strong move. Be concise and use plain English."
            }
        ]
    )
    explanation = response.choices[0].message.content

    return jsonify({
        "best_move": str(best_move),
        "explanation": explanation
    })

if __name__ == "__main__":
    app.run(debug=True)