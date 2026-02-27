from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

model = tf.keras.models.load_model('rice_disease_model.h5')
CLASSES = ['Bạc lá (Bacterial Blight)', 'Đạo ôn (Blast)', 'Đốm nâu (Brown Spot)', 'Tungro']

def prepare_image(image, target_size):
    if image.mode != "RGB":
        image = image.convert("RGB")
    image = image.resize(target_size)
    image = tf.keras.preprocessing.image.img_to_array(image)
    image = np.expand_dims(image, axis=0)
    image = image / 255.0
    return image

@app.route("/predict", methods=["POST"])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    image = Image.open(io.BytesIO(file.read()))
    
    # Xử lý ảnh
    processed_image = prepare_image(image, target_size=(224, 224))
    
    # Dự đoán
    prediction = model.predict(processed_image)
    predicted_class = np.argmax(prediction, axis=1)[0]
    confidence = np.max(prediction)

    result = {
        "disease": CLASSES[predicted_class],
        "confidence": float(confidence),
        "all_scores": prediction[0].tolist()
    }

    print("=== ĐIỂM DỰ ĐOÁN ===")
    print(f"Bạc lá: {result['all_scores'][0]:.4f}")
    print(f"Đạo ôn: {result['all_scores'][1]:.4f}")
    print(f"Đốm nâu: {result['all_scores'][2]:.4f}")
    print(f"Tungro: {result['all_scores'][3]:.4f}")
    print("====================")
    
    return jsonify(result)

if __name__ == "__main__":
    app.run(port=5000, debug=True)