# Iconic

A plugin for iconophiles, designed to blend seamlessly with vanilla Obsidian.

Click almost any icon on a tab, sidebar, ribbon, or title bar to swap in one of the 1,700+ icons included in the app, or one of the 1,900+ emojis that your device supports.

![Banner](banner.webp)

> ⤿ Themes: [Ayu Light & Mirage](https://github.com/taronull/ayu-obsidian) / [Fancy-a-Story](https://github.com/ElsaTam/obsidian-fancy-a-story) / [Primary](https://github.com/primary-theme/obsidian)

Includes language support for English, Arabic, German, Spanish, French, Indonesian, Japanese, Russian, and Simplified Chinese. Most of these languages are currently machine-translated, but if you can supply more accurate translations, absolutely send a message or a pull request :)

## Supported items

- Tabs 📑
- Files & Folders 📝📂
- Bookmarks & Groups 🔖📂
- Tags 🏷️
- Properties 📦
- Ribbon commands 🎀
- Minimize/Maximize/Close buttons 🪟
- Sidebar toggles ◀️▶️
- Help/Settings buttons ❔⚙️
- Pin buttons (on tablets) 📌

## How to use

### Changing an icon

Secondary-click an item whose icon you want to change, then click **Change icon** from the menu. You can open menus on mobile by pressing & holding an item. Certain lists like Files, Bookmarks, and Properties let you hold <kbd>Alt</kbd> or <kbd>⇧ Shift</kbd> to select multiple items at once.

Every icon is searchable by name. You can filter between icons and/or emojis by clicking the bottom two toggles. When you find an icon that sings for you, click it to confirm.

You can also choose one of nine optional colors per icon. These colors follow the CSS theme of your vault, so they adjust automatically when it changes. If you prefer a specific RGB color, secondary-click the bubble to open the full color picker.

![Icon picker](icon-picker.webp)

### Setting up rules

You can automate your file & folder icons based on a variety of conditions, like their name, their extension, their parent folder, their tags, their property values, the date you've created or modified them, and even the current time of day. Automated icons never remove your custom icons — only replace them visually — so you can be as experimental as you want.

Open the rulebook from the ribbon, from the plugin settings, or by using the **Open rulebook** command. There are currently two pages in the rulebook: **File rules** and **Folder rules**, which affect files and folders respectively.

After creating your first rule, you can edit it using the rule editor. Every rule has an icon, which will overrule the icon of anything which meets the rule's conditions. A condition is a true or false test; it either matches, or it doesn't, and this decides whether the rule gets triggered. If you only need one condition to match, just click the **Any** button. You can check the match results of your rule by clicking the **Matches** button at the bottom.

Once you save a rule, you'll see an **Edit rule** action in the menus of any icons which are being overruled. The icon picker also warns you if you try to change an overruled icon.

![Rule editor](rule-editor.webp)

## What makes this plugin different from [Iconize](https://github.com/FlorianWoelki/obsidian-iconize)?

Both plugins can change the icons & colors of files, folders, and bookmarks. But **Iconic** also has the ability to:

- Change icons of plugin tabs, tags, properties, ribbon commands, and a variety of window buttons
- Change icons by clicking them directly
- Change icons & colors from the same dialog
- Dynamically shift colors to match your theme
- Auto-set icons using a conditional rule system

### Can I use both plugins together?

Sort of, just expect a few visual bugs! They currently do some fighting over control of tab icons and the Bookmarks pane.

## License

This plugin is released under an [MIT No Attribution](https://choosealicense.com/licenses/mit-0/) license, which means you're free to modify and share its source code without needing to credit the author (me). It also protects the code author from liability for damages, so I recommend using a similar license if you republish this code.
