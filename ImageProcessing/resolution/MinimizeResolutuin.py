# import numpy as np
# from PIL import Image
# from math import gcd
# from functools import reduce


# # пытается уменьшить размер пиксального изображения
# def get_block_size(img_array):
#     """Находит размер сетки (блока) путем поиска НОД длин цветовых сегментов"""
#     def get_gcd_for_sequence(seq):
#         # Находим длины последовательностей одинаковых элементов
#         # [255, 255, 0, 0, 0, 255] -> [2, 3, 1]
#         diff = np.where(np.any(seq[1:] != seq[:-1], axis=1))[0] + 1
#         lengths = np.diff(np.concatenate(([0], diff, [len(seq)])))
        
#         # Находим НОД всех длин в этом ряду
#         if len(lengths) == 0: return 0
#         return reduce(gcd, lengths)

#     # Проверяем несколько строк и колонок (для скорости)
#     gcds = []
#     step = 1 #max(1, img_array.shape[0] // 10) # берем каждую 10-ю строку
    
#     # По горизонтали
#     for i in range(0, img_array.shape[0], step):
#         res = get_gcd_for_sequence(img_array[i, :])
#         if res > 1: gcds.append(res)
        
#     # По вертикали
#     for i in range(0, img_array.shape[1], step):
#         res = get_gcd_for_sequence(img_array[:, i])
#         if res > 1: gcds.append(res)

#     if not gcds:
#         return 1
    
#     # Возвращаем самый частый НОД (на случай шума)
#     return max(set(gcds), key=gcds.count)

# def restore_pixel_art(input_path, output_path):
#     # 1. Открываем и убираем лишние пустые поля (Crop)
#     img = Image.open(input_path).convert("RGBA")
#     bbox = img.getbbox()
#     if bbox:
#         img = img.crop(bbox)
    
#     img_arr = np.array(img)

#     # 2. Определяем размер блока
#     block_size = get_block_size(img_arr)
#     print(f"Определен размер блока: {block_size}x{block_size} пикселей")

#     if block_size <= 1:
#         print("Изображение уже в минимальном разрешении или не является сеткой.")
#         img.save(output_path)
#         return

#     # 3. Уменьшаем изображение, просто забирая каждый N-ый пиксель
#     # Это гарантирует отсутствие интерполяции вообще
#     small_arr = img_arr[::block_size, ::block_size]
    
#     # 4. Сохраняем результат
#     result_img = Image.fromarray(small_arr)
#     result_img.save(output_path)
#     print(f"Финальное разрешение: {result_img.size[0]}x{result_img.size[1]}")

# # Использование
# restore_pixel_art("ImageProcessing/resolution/input.png", "ImageProcessing/resolution/restored.png")



# import numpy as np
# from PIL import Image
# from math import gcd
# from functools import reduce

# def get_block_size(img_array):
#     """Автоматический поиск размера пикселя через НОД"""
#     def get_gcd_for_sequence(seq):
#         diff = np.where(np.any(seq[1:] != seq[:-1], axis=1))[0] + 1
#         if len(diff) == 0: return None
#         lengths = np.diff(np.concatenate(([0], diff, [len(seq)])))
#         return reduce(gcd, lengths)

#     gcds = []
#     step = max(1, img_array.shape[0] // 5) 
#     for i in range(0, img_array.shape[0], step):
#         res = get_gcd_for_sequence(img_array[i, :])
#         if res and res < (img_array.shape[1] // 4): gcds.append(res)
    
#     if not gcds: return 1
#     return max(set(gcds), key=gcds.count)

# def process_spritesheet(input_path, output_path, rows, cols, 
#                         pixel_scale=None, 
#                         forced_w=None, 
#                         forced_h=None, 
#                         align='bottom'):
#     """
#     pixel_scale: принудительный размер "старого" пикселя (например 8). Если None - авто.
#     forced_w/forced_h: принудительный размер ячейки на выходе. Если None - по самому большому кадру.
#     align: 'bottom', 'top', 'center'
#     """
#     img = Image.open(input_path).convert("RGBA")
#     img_arr = np.array(img)
    
#     # 1. Определяем масштаб сжатия
#     block_size = pixel_scale if pixel_scale else get_block_size(img_arr)
#     print(f"Используемый масштаб пикселя: {block_size}")

#     full_w, full_h = img.size
#     chunk_w = full_w // cols
#     chunk_h = full_h // rows

#     processed_chunks = []
#     max_w_found = 0
#     max_h_found = 0

#     # 2. Нарезка и ресайз каждого чанка
#     for r in range(rows):
#         row_list = []
#         for c in range(cols):
#             left = c * chunk_w
#             top = r * chunk_h
#             chunk = img.crop((left, top, left + chunk_w, top + chunk_h))
            
#             # Убираем пустоту вокруг персонажа
#             bbox = chunk.getbbox()
#             if bbox:
#                 chunk = chunk.crop(bbox)
#                 # Уменьшаем до честного пиксель-арта
#                 new_w = chunk.size[0] // block_size
#                 new_h = chunk.size[1] // block_size
#                 if new_w > 0 and new_h > 0:
#                     chunk = chunk.resize((new_w, new_h), Image.NEAREST)
#             else:
#                 chunk = Image.new("RGBA", (1, 1), (0,0,0,0))

#             row_list.append(chunk)
#             max_w_found = max(max_w_found, chunk.size[0])
#             max_h_found = max(max_h_found, chunk.size[1])
        
#         processed_chunks.append(row_list)

#     # 3. Определяем финальный размер ячейки
#     final_cell_w = forced_w if forced_w else max_w_found
#     final_cell_h = forced_h if forced_h else max_h_found
    
#     print(f"Итоговый размер ячейки чанка: {final_cell_w}x{final_cell_h}")

#     # 4. Сборка полотна
#     final_img = Image.new("RGBA", (final_cell_w * cols, final_cell_h * rows), (0, 0, 0, 0))

#     for r in range(rows):
#         for c in range(cols):
#             chunk = processed_chunks[r][c]
            
#             # Если чанк после обрезки оказался больше forced_w/h, он будет обрезан краями ячейки
#             # Центрируем по горизонтали
#             paste_x = c * final_cell_w + (final_cell_w - chunk.size[0]) // 2
            
#             base_y = r * final_cell_h
#             if align == 'bottom':
#                 paste_y = base_y + (final_cell_h - chunk.size[1])
#             elif align == 'center':
#                 paste_y = base_y + (final_cell_h - chunk.size[1]) // 2
#             else: # top
#                 paste_y = base_y

#             final_img.paste(chunk, (paste_x, paste_y))

#     final_img.save(output_path)
#     print(f"Готово! Сохранено в {output_path}. Итоговое разрешение: {final_img.size}")

# # --- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ---

# # Пример : Автоматически найти масштаб и подогнать под размер чанка 32x32
# # process_spritesheet("input.png", "out1.png", rows=4, cols=4, forced_w=32, forced_h=32, pixel_scale=8, align='bottom') # or 'top'

# process_spritesheet(
#     "ImageProcessing/resolution/frisk_fixed.png", "ImageProcessing/resolution/restored.png", 
#     rows=4, 
#     cols=4, 
#     pixel_scale=4,
#     align='top') 

import numpy as np
from PIL import Image
from math import gcd
from functools import reduce

def get_block_size(img_array):
    """Автоматический поиск размера пикселя через НОД"""
    def get_gcd_for_sequence(seq):
        diff = np.where(np.any(seq[1:] != seq[:-1], axis=1))[0] + 1
        if len(diff) == 0: return None
        lengths = np.diff(np.concatenate(([0], diff, [len(seq)])))
        return reduce(gcd, lengths)

    gcds = []
    step = max(1, img_array.shape[0] // 100) 
    for i in range(0, img_array.shape[0], step):
        res = get_gcd_for_sequence(img_array[i, :])
        if res and res < (img_array.shape[1] // 4): gcds.append(res)
    
    if not gcds: return 1
    return max(set(gcds), key=gcds.count)

def process_spritesheet(input_path, output_path, rows, cols, 
                        pixel_scale=None, 
                        forced_w=None, 
                        forced_h=None, 
                        align='bottom'):
    """
    pixel_scale: принудительный размер "старого" пикселя (например 8). Если None - авто.
    forced_w/forced_h: принудительный размер ячейки на выходе. Если None - по самому большому кадру.
    align: 'bottom', 'top', 'center'
    """
    img = Image.open(input_path).convert("RGBA")
    img_arr = np.array(img)
    
    # 1. Определяем масштаб сжатия
    block_size = pixel_scale if pixel_scale else get_block_size(img_arr)
    print(f"Используемый масштаб пикселя: {block_size}")

    full_w, full_h = img.size
    chunk_w = full_w // cols
    chunk_h = full_h // rows

    processed_chunks = []
    max_w_found = 0
    max_h_found = 0

    # 2. Нарезка и ресайз каждого чанка
    for r in range(rows):
        row_list = []
        for c in range(cols):
            left = c * chunk_w
            top = r * chunk_h
            chunk = img.crop((left, top, left + chunk_w, top + chunk_h))
            
            # Убираем пустоту вокруг персонажа
            bbox = chunk.getbbox()
            if bbox:
                chunk = chunk.crop(bbox)
                # Уменьшаем до честного пиксель-арта
                new_w = chunk.size[0] // block_size
                new_h = chunk.size[1] // block_size
                if new_w > 0 and new_h > 0:
                    chunk = chunk.resize((new_w, new_h), Image.NEAREST)
            else:
                chunk = Image.new("RGBA", (1, 1), (0,0,0,0))

            row_list.append(chunk)
            max_w_found = max(max_w_found, chunk.size[0])
            max_h_found = max(max_h_found, chunk.size[1])
        
        processed_chunks.append(row_list)

    # 3. Определяем финальный размер ячейки
    final_cell_w = forced_w if forced_w else max_w_found
    final_cell_h = forced_h if forced_h else max_h_found
    
    print(f"Итоговый размер ячейки чанка: {final_cell_w}x{final_cell_h}")

    # 4. Сборка полотна
    final_img = Image.new("RGBA", (final_cell_w * cols, final_cell_h * rows), (0, 0, 0, 0))

    for r in range(rows):
        for c in range(cols):
            chunk = processed_chunks[r][c]
            
            # Если чанк после обрезки оказался больше forced_w/h, он будет обрезан краями ячейки
            # Центрируем по горизонтали
            paste_x = c * final_cell_w + (final_cell_w - chunk.size[0]) // 2
            
            base_y = r * final_cell_h
            if align == 'bottom':
                paste_y = base_y + (final_cell_h - chunk.size[1])
            elif align == 'center':
                paste_y = base_y + (final_cell_h - chunk.size[1]) // 2
            else: # top
                paste_y = base_y

            final_img.paste(chunk, (paste_x, paste_y))

    final_img.save(output_path)
    print(f"Готово! Сохранено в {output_path}. Итоговое разрешение: {final_img.size}")

# --- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ---

# Пример 1: Автоматически найти масштаб и подогнать под размер чанка 32x32
# process_spritesheet("input.png", "out1.png", rows=4, cols=4, forced_w=32, forced_h=32, pixel_scale=8, align='bottom')
process_spritesheet("ImageProcessing/resolution/input.png", "ImageProcessing/resolution/restored.png", rows=1, cols=4, align='top')

