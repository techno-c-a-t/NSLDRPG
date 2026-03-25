import numpy as np
from PIL import Image
from math import gcd
from functools import reduce


# пытается уменьшить размер пиксального изображения
def get_block_size(img_array):
    """Находит размер сетки (блока) путем поиска НОД длин цветовых сегментов"""
    def get_gcd_for_sequence(seq):
        # Находим длины последовательностей одинаковых элементов
        # [255, 255, 0, 0, 0, 255] -> [2, 3, 1]
        diff = np.where(np.any(seq[1:] != seq[:-1], axis=1))[0] + 1
        lengths = np.diff(np.concatenate(([0], diff, [len(seq)])))
        
        # Находим НОД всех длин в этом ряду
        if len(lengths) == 0: return 0
        return reduce(gcd, lengths)

    # Проверяем несколько строк и колонок (для скорости)
    gcds = []
    step = max(1, img_array.shape[0] // 100) # берем каждую 100-ю строку
    
    # По горизонтали
    for i in range(0, img_array.shape[0], step):
        res = get_gcd_for_sequence(img_array[i, :])
        if res > 1: gcds.append(res)
        
    # По вертикали
    for i in range(0, img_array.shape[1], step):
        res = get_gcd_for_sequence(img_array[:, i])
        if res > 1: gcds.append(res)

    if not gcds:
        return 1
    
    # Возвращаем самый частый НОД (на случай шума)
    return max(set(gcds), key=gcds.count)

def restore_pixel_art(input_path, output_path):
    # 1. Открываем и убираем лишние пустые поля (Crop)
    img = Image.open(input_path).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    
    img_arr = np.array(img)

    # 2. Определяем размер блока
    block_size = get_block_size(img_arr)
    print(f"Определен размер блока: {block_size}x{block_size} пикселей")

    if block_size <= 1:
        print("Изображение уже в минимальном разрешении или не является сеткой.")
        img.save(output_path)
        return

    # 3. Уменьшаем изображение, просто забирая каждый N-ый пиксель
    # Это гарантирует отсутствие интерполяции вообще
    small_arr = img_arr[::block_size, ::block_size]
    
    # 4. Сохраняем результат
    result_img = Image.fromarray(small_arr)
    result_img.save(output_path)
    print(f"Финальное разрешение: {result_img.size[0]}x{result_img.size[1]}")

# Использование
restore_pixel_art("ImageProcessing/resolution/input.png", "ImageProcessing/resolution/restored.png")