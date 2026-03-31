import json
from fpdf import FPDF
import os

def json_to_pdf(input_json, output_pdf):
    # Загружаем данные
    with open(input_json, 'r', encoding='utf-8') as f:
        data = json.load(f)

    pdf = FPDF()
    pdf.add_page()
    
    # Путь к шрифту (стандарт для Ubuntu)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    if not os.path.exists(font_path):
        print("Шрифт не найден. Установите: sudo apt install fonts-dejavu-core")
        return

    pdf.add_font('DejaVu', '', font_path)
    pdf.set_font('DejaVu', size=10)

    last_time = None

    for msg in data.get('messages', []):
        # Пропускаем сервисные сообщения без текста
        if msg.get('type') != 'message' or not msg.get('text'):
            continue

        current_time = int(msg.get('date_unixtime', 0))

        # Проверка интервала 10 минут (600 секунд)
        if last_time and (current_time - last_time >= 600):
            pdf.set_text_color(150, 0, 0)  # Выделим цветом для наглядности
            pdf.multi_cell(0, 10, txt="<Прошло 10 мин или больше>", align='C')
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)

        # Извлекаем имя и текст
        name = msg.get('from', 'Unknown')
        raw_text = msg.get('text', '')

        # Текст в Telegram JSON может быть списком (если есть ссылки/форматирование)
        if isinstance(raw_text, list):
            full_text = "".join([part if isinstance(part, str) else part.get('text', '') for part in raw_text])
        else:
            full_text = raw_text

        # Записываем в PDF
        content = f"{name}: {full_text}"
        pdf.multi_cell(0, 6, txt=content)
        pdf.ln(1) # Небольшой отступ между сообщениями

        last_time = current_time

    pdf.output(output_pdf)
    print(f"Готово! Файл сохранен как {output_pdf}")

# Запуск
json_to_pdf('summarizator/result.json', 'summarizator/output.pdf')