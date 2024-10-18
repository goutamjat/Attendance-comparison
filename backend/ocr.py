import sys
import requests
import json
import cv2
import os
import numpy as np
from PIL import Image

def preprocess_image(image_path, output_path='preprocessed_image.jpg'):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary_img = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    processed_img = cv2.fastNlMeansDenoising(binary_img, h=30)
    cv2.imwrite(output_path, processed_img)
    return output_path

def compress_image(image_path, output_path, target_size_kb=1000, quality=85):
    img = Image.open(image_path)
    original_size = os.path.getsize(image_path) / 1024
    if original_size <= target_size_kb:
        img.save(output_path)
        return
    quality_value = quality
    while True:
        img.save(output_path, "JPEG", quality=quality_value)
        compressed_size = os.path.getsize(output_path) / 1024
        if compressed_size <= target_size_kb:
            break
        quality_value -= 5
        if quality_value < 10:
            break

def extract_text_from_image(image_path, api_key):
    url = 'https://api.ocr.space/parse/image'
    with open(image_path, 'rb') as image_file:
        payload = {'apikey': api_key, 'isTable': 'true', 'OCREngine': '2'}
        files = {'filename': image_file}
        response = requests.post(url, data=payload, files=files)

        # Check for successful response
        if response.status_code != 200:
            print(f"API returned a non-200 status code: {response.status_code}")
            print(f"Response Content: {response.text}")
            return None

        # Attempt to parse JSON response
        try:
            result = response.json()
        except ValueError as e:
            print(f"Error parsing JSON: {e}")
            print(f"Response Content: {response.text}")
            return None

        if 'IsErroredOnProcessing' in result and result['IsErroredOnProcessing']:
            print(f"Error: {result.get('ErrorMessage')}")
            return None

        if 'ParsedResults' not in result or not result['ParsedResults']:
            print("No ParsedResults found in the response.")
            return None

        extracted_text = result['ParsedResults'][0].get('ParsedText', '')
        return extracted_text

def save_text_to_json(text, output_file):
    data = {"extracted_text": text}
    with open(output_file, 'w') as json_file:
        json.dump(data, json_file, indent=4)
    print(f"Extracted text saved to {output_file}")

if __name__ == '__main__':
    image_path = sys.argv[1]
    output_file = sys.argv[2]
    api_key = 'K81017824888957'  # Replace with your actual OCR.space API key

    preprocessed_image_path = preprocess_image(image_path)
    compressed_output_path = 'compressed_preprocessed_image.jpg'
    compress_image(preprocessed_image_path, compressed_output_path, target_size_kb=1000)

    extracted_text = extract_text_from_image(compressed_output_path, api_key)
    if extracted_text:
        save_text_to_json(extracted_text, output_file)
