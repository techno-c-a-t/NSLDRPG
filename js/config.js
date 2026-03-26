export const CONFIG_ISAAC
 = {
    CHUNK: 8,
    WORLD_SIZE: 256, // 256 * 8 = 2048px
    VIEW_SIZE: 512,
    PLAYER_W: 3, // в чанках
    PLAYER_H: 9,  // в чанках
    MOVE_SPEED: 0.3,
    SPRITE_W: 30,//744 / 4, // 186px
    SPRITE_H: 93,//1080 / 4, // 270px
    ANIM_SPEED: 0.05,    // Скорость смены кадров
    P_COLL_W: 5,
    P_COLL_H: 4,  // Только 2 чанка высоты (ноги)
    P_COLL_OX: 0, // Без смещения по X вправо
    P_COLL_OY: 4,  // Смещение на 6 чанков вниз (8 - 2 = 6)
    DEBUG: 0,
    START_X: 60,
    START_Y: 60,
    SPRITE_PATH: "assets/characters/isaac.png"
};

export const CONFIG = {
    CHUNK: 8,
    WORLD_SIZE: 256, // 256 * 8 = 2048px
    VIEW_SIZE: 256, //px
    PLAYER_W: 5, // в чанках
    PLAYER_H: 8,  // в чанках
    MOVE_SPEED: 0.3,
    SPRITE_W: 748 / 4, // 186px
    SPRITE_H: 1100 / 4, // 270px
    ANIM_SPEED: 0.05,    // Скорость смены кадров
    P_COLL_W: 5,
    P_COLL_H: 4,  // Только 2 чанка высоты (ноги)
    P_COLL_OX: 0, // Без смещения по X вправо
    P_COLL_OY: 4,  // Смещение на 6 чанков вниз (8 - 2 = 6)
    DEBUG: 0,
    START_X: 60,
    START_Y: 60,
    SPRITE_PATH: "assets/characters/aligned_frisk.png"
};
