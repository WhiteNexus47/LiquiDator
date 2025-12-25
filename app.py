from flask import Flask, render_template, request, redirect
import os

app = Flask(__name__)
IMAGE_DIR = "assets/img/New-Images"

def get_images():
    return [
        f for f in os.listdir(IMAGE_DIR)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ]

@app.route("/", methods=["GET", "POST"])
def rename_images():
    images = get_images()

    if request.method == "POST":
        selected = request.form.getlist("images")
        base = request.form["base"].strip()

        for i, filename in enumerate(selected):
            ext = os.path.splitext(filename)[1]
            new_name = f"{base}{'' if i == 0 else i}{ext}"

            old_path = os.path.join(IMAGE_DIR, filename)
            new_path = os.path.join(IMAGE_DIR, new_name)

            if old_path != new_path:
                os.rename(old_path, new_path)

        return redirect("/")

    return render_template("rename.html", images=images)

if __name__ == "__main__":
    app.run(debug=True)
