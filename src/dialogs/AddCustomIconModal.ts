import { App, Modal, Setting, ButtonComponent, Notice } from 'obsidian';
import CustomIconManager from 'src/managers/CustomIconManager';

export class AddCustomIconModal extends Modal {
  private fileInputEl: HTMLInputElement;
  private nameInputEl: HTMLInputElement;

  constructor(app: App, private manager: CustomIconManager, private onDone: () => void) {
    super(app);
  }

  onOpen() {
    this.titleEl.setText('Add Custom SVG Icon');
    // File picker
    new Setting(this.contentEl)
      .setName('SVG File')
      .setDesc('Choose an .svg file (max 100 KB)')
      .then(setting => {
        this.fileInputEl = setting.controlEl.createEl('input', {
          type: 'file',
          accept: '.svg'
        }) as HTMLInputElement;
      });
    // Name input
    new Setting(this.contentEl)
      .setName('Icon Name')
      .setDesc('Alphanumeric, hyphens, or underscores only')
      .addText(t => {
        this.nameInputEl = t.inputEl;
      });
    // Buttons
    const btnContainer = this.contentEl.createDiv('modal-button-container');
    new ButtonComponent(btnContainer)
      .setButtonText('Cancel')
      .onClick(() => this.close());
    new ButtonComponent(btnContainer)
      .setButtonText('Add')
      .setCta()
      .onClick(async () => {
        try {
          if (!this.fileInputEl.files?.length) throw new Error('No file selected.');
          const file = this.fileInputEl.files[0];
          if (file.size > this.manager.MAX_SIZE) 
            throw new Error(`File too large (${file.size} bytes).`);
          const name = this.nameInputEl.value.trim();
          const text = await file.text();
          await this.manager.addIcon(name, text);
          new Notice(`Custom icon “${name}” added.`);
          this.onDone();
          this.close();
        } catch (e: any) {
          new Notice(`Error: ${e.message}`);
        }
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

export{}
