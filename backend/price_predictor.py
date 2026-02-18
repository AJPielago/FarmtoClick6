import os
import argparse
import joblib
import json
from datetime import datetime

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ml_models', 'price_model_rf.pkl')

def month_from_iso(s):
    try:
        return datetime.fromisoformat(s).month
    except Exception:
        return 0

def predict(model, product_name, source_file='', unit='kg', file_date=None):
    name_text = f"{product_name} __ {source_file}"
    month = month_from_iso(file_date) if file_date else 0
    row = {'name_text': name_text, 'unit': unit, 'month': month}
    pred = model.predict([row])[0]
    return float(pred)

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--model', default=MODEL_PATH)
    p.add_argument('--product', required=True)
    p.add_argument('--source-file', default='')
    p.add_argument('--unit', default='kg')
    p.add_argument('--file-date', default=None)
    args = p.parse_args()

    model = joblib.load(args.model)
    pred = predict(model, args.product, args.source_file, args.unit, args.file_date)
    print(json.dumps({'predicted_price': round(pred,2)}))
