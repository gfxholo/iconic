import { App, Modal, Setting, ButtonComponent, Notice } from 'obsidian';
import CustomIconManager, { CustomIconEntry } from 'src/managers/CustomIconManager';

export class RenameCustomIconModal extends Modal {
  private selectEl: HTMLSelectElement;
  private nameInputEl: HTMLInputElement;

  constructor(app: App, private manager: CustomIconManager, private onDone: () => void) {
    super(app);
  }

  onOpen() {
    this.titleEl.setText('Rename Custom SVG Icon');
    const icons = this.manager.listIcons();
    // Dropdown of all names + aliases
    new Setting(this.contentEl)
      .setName('Select Icon')
      .then(setting => {
        this.selectEl = setting.controlEl.createEl('select') as HTMLSelectElement;
        for (const e of icons) {
          const all = [e.name, ...e.aliases];
          all.forEach(n => {
            const opt = this.selectEl.createEl('option');
            opt.value = n; 
            opt.text = n === e.name ? n : `${n} (alias)`;
          });
        }
      });
    // New name
    new Setting(this.contentEl)
      .setName('New Name')
      .addText(t => {
        this.nameInputEl = t.inputEl;
      });
    // Buttons
    const btnC = this.contentEl.createDiv('modal-button-container');
    new ButtonComponent(btnC).setButtonText('Cancel').onClick(() => this.close());
    new ButtonComponent(btnC).setButtonText('Rename').setCta().onClick(async () => {
      try {
        const oldName = this.selectEl.value;
        const newName = this.nameInputEl.value.trim();
        await this.manager.renameIcon(oldName, newName);
        new Notice(`Renamed “${oldName}” → “${newName}”.`);
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