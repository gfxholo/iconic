import { App, Modal, Setting, ButtonComponent, Notice } from 'obsidian';
import CustomIconManager from 'src/managers/CustomIconManager';

export class DeleteCustomIconModal extends Modal {
  private selectEl: HTMLSelectElement;

  constructor(app: App, private manager: CustomIconManager, private onDone: () => void) {
    super(app);
  }

  onOpen() {
    this.titleEl.setText('Delete Custom SVG Icon');
    const icons = this.manager.listIcons();
    new Setting(this.contentEl)
      .setName('Select Icon or Alias')
      .then(setting => {
        this.selectEl = setting.controlEl.createEl('select') as HTMLSelectElement;
        for (const e of icons) {
          [e.name, ...e.aliases].forEach(n => {
            const opt = this.selectEl.createEl('option');
            opt.value = n; 
            opt.text = n === e.name ? n : `${n} (alias)`;
          });
        }
      });
    const btnC = this.contentEl.createDiv('modal-button-container');
    new ButtonComponent(btnC).setButtonText('Cancel').onClick(() => this.close());
    new ButtonComponent(btnC).setButtonText('Delete').setWarning().onClick(async () => {
      try {
        const name = this.selectEl.value;
        await this.manager.removeIcon(name);
        new Notice(`Removed custom icon “${name}”.`);
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