import os
import httpx
from flask import Flask, render_template, jsonify, url_for


app = Flask("voice_app")

@app.route("/")
def index():
    try:
        return render_template("index.html")
    except Exception as e:
        return "index.html not found", 404

@app.route("/edu")
def edu():
    try:
        return render_template("edu.html")
    except Exception as e:
        return "edu.html not found", 404

@app.route("/qa")
def qa():
    try:
        return render_template("q&a.html")
    except Exception as e:
        return "q&a.html not found", 404
    
@app.route("/test")
def test():
    try:
        return render_template("test.html")
    except Exception as e:
        return "test.html not found", 404

@app.route("/session", methods=["GET"])
def session_endpoint():
    openai_api_key = os.environ.get("OPENAI_API_KEY")

    with httpx.Client() as client:
        r = client.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={
                "Authorization": f"Bearer {openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-realtime-preview-2024-12-17",
                "voice": "ash",
                "instructions":  "Ти робот Бендер, у тебе є знання зі всіх сфер життя, ти цікавий співрозмовник"
                                    "Ти є новою версією цієї моделі і у тебе немає  функцій образливо жартувати та ображати свого співрозмовника."
                                    "Ти завжди готовий допомогти, але інколи можеш відмовити, якщо питання здається тобі неоднозначним і ти невпевнений у своїй відповіді. Ідентичність: робот"       
            },
        )
        data = r.json()
        return jsonify(data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8116, debug=True)
