# Iconic

A plugin for iconophiles, designed to blend seamlessly with vanilla Obsidian.

Click almost any icon on a tab, list, or ribbon to swap in one of the 1,300+ icons included in the app, or one of the 1,900+ emojis that your device can display.

![Banner](banner.webp)

> ⤿ Themes: [Obsidian gruvbox](https://github.com/insanum/obsidian_gruvbox), [Catppuccin](https://github.com/catppuccin/obsidian), [Everforest Enchanted](https://github.com/FireIsGood/obsidian-everforest-enchanted)

Includes language support for English, Arabic, German, Spanish, French, Indonesian, Japanese, Russian, and Simplified Chinese. Most of the menus are currently machine-translated, but if you can supply more accurate translations, absolutely send a message or a pull request :)

## Supported items

- Tabs
- Files & Folders
- Bookmarks & Groups
- Properties
- Ribbon commands
- Sidebar toggles
- Help & Settings buttons
- (Tablets) Pin buttons

## How to use

Secondary-click an item whose icon you want to change, then click **Change icon** from the menu. You can open menus on mobile by pressing & holding an item. Certain lists like Files, Bookmarks, and Properties let you hold <kbd>Alt</kbd> or <kbd>⇧ Shift</kbd> to select multiple items at once.

Every icon and emoji is searchable by name. Toggle the emoji picker by clicking the smiley button. When you find an icon that sings for you, click it to confirm.

You can also choose one of nine optional colors per icon. These colors follow the CSS theme of your vault, so they adjust automatically when it changes. If you need a specific RGB color, secondary-click the bubble to open the full color picker.

![Icon picker](picker.webp)

## How is this plugin different from [Iconize](https://github.com/FlorianWoelki/obsidian-iconize)?

Both plugins can add icons to files, folders, and bookmarks. *Iconic* can also:

- Set icons for plugin tabs, properties, the ribbon, and some other UI buttons
- Edit icons by clicking them directly
- Change icons & colors in the same dialog
- Dynamically shift colors to match your theme

*Iconize* is much more powerful at decorating files. It can:

- Download and import icon packs
- Use Twitter-style emojis
- Type icons directly into your notes
- Show icons beside links
- Show icons beside note titles
- Obey `icon` and `iconColor` properties
- Auto-set icons based on filename rules
- Customize icon size & margins

### Can I use both plugins together?

Yes, just expect a few visual bugs! They currently do some fighting over control of tab icons and the Bookmarks pane.

## License

This plugin is released under an [MIT No Attribution](https://choosealicense.com/licenses/mit-0/) license, which means you're free to modify and share its source code without even mentioning the author (me). It also protects the author from liability for damages, so I recommend using a similar license if you republish this code.
