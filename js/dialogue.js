export class DialogueManager {
    constructor() {
        this.box = document.getElementById('dialogue-box');
        this.nameEl = document.getElementById('dialogue-name');
        this.textEl = document.getElementById('dialogue-text');
        this.isActive = false;
        this.isTyping = false;
        this.textQueue = [];
        this.currentText = "";
        this.typeIndex = 0;
        this.typeSpeed = 30; // Скорость печати (мс)
    }

    show(name, lines) {
        this.isActive = true;
        this.textQueue = [...lines];
        this.nameEl.innerText = name;
        this.box.classList.remove('hidden');
        this.next();
    }

    next() {
        if (this.isTyping) {
            // Если игрок нажал "пропустить", показываем текст целиком
            this.isTyping = false;
            this.textEl.innerText = this.currentText;
            return;
        }

        if (this.textQueue.length === 0) {
            this.hide();
            return;
        }

        this.currentText = this.textQueue.shift();
        this.typeText();
    }

    typeText() {
        this.isTyping = true;
        this.typeIndex = 0;
        this.textEl.innerText = "";
        
        const timer = setInterval(() => {
            if (!this.isTyping) {
                clearInterval(timer);
                return;
            }
            
            this.textEl.innerText += this.currentText[this.typeIndex];
            this.typeIndex++;
            
            if (this.typeIndex >= this.currentText.length) {
                this.isTyping = false;
                clearInterval(timer);
            }
        }, this.typeSpeed);
    }

    hide() {
        this.isActive = false;
        this.box.classList.add
    /* Чтобы текст не "прыгал" при появлении новых букв */('hidden');
    }
}