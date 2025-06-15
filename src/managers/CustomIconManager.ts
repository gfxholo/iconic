import { normalizePath } from "obsidian";
import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface CustomIconEntry {
    /** Primary name */
    name: string;
    /** Filename in disk (e.g. “my-icon.svg”) */
    file: string;
    /** Aliases pointing to this same file */
    aliases: string[];
}

export default class CustomIconManager {
    private dataDir: string;
    private iconsDir: string;
    private indexFile: string;
    private index: CustomIconEntry[] = [];
    public MAX_SIZE = 100 * 1024; // 100 KB

    constructor(dataDir: string) {
        this.dataDir    = normalizePath(dataDir);
        this.iconsDir   = path.join(this.dataDir, "custom-icons");
        this.indexFile  = path.join(this.iconsDir, "index.json");
    }

    /** Ensure folders & load index.json (or create empty index). */
    async init() {
        await fs.mkdir(this.iconsDir, { recursive: true });
        try {
            const raw = await fs.readFile(this.indexFile, "utf8");
            this.index = JSON.parse(raw);
        } catch (e) {
            this.index = [];
            await this.saveIndex();
        }
    }

    /** Persist the in-memory index to disk. */
    private async saveIndex() {
        await fs.writeFile(this.indexFile, JSON.stringify(this.index, null, 2), "utf8");
    }

    /** Compute the SHA-1 hash of an SVG string. */
    private hashContent(svg: string) {
        return crypto.createHash("sha1").update(svg).digest("hex");
    }

    /** Sanitize a user‐supplied name to `[A-Za-z0-9_-]+`. */
    private sanitizeName(name: string) {
        const clean = name.trim().replace(/[^A-Za-z0-9_-]/g, "_");
        if (!/^[A-Za-z0-9_-]+$/.test(clean)) {
            throw new Error("Name must contain only letters, numbers, hyphens or underscores.");
        }
        return clean;
    }

    /**
     * Add a new custom icon.
     *
     * @param name  Desired name (no extension)
     * @param svg   Full SVG text
     * @returns the entry added or aliased-to
     */

    // Inside CustomIconManager class

    async addIcon(name: string, svg: string): Promise<CustomIconEntry> {
        const cleanName = this.sanitizeName(name);
        const buffer = Buffer.from(svg, "utf8");

        if (buffer.length > this.MAX_SIZE) {
            throw new Error(`SVG too large (${buffer.length} bytes, max ${this.MAX_SIZE}).`);
        }

        const hash = this.hashContent(svg);

        // ─── Refactored: async loop to detect duplicate content ────────────────
        let existing: CustomIconEntry | undefined;
        for (const entry of this.index) {
            const filePath = path.join(this.iconsDir, entry.file);
            let contents: string;
            try {
            contents = await fs.readFile(filePath, "utf8");
            } catch {
                continue; // skip if the file is missing or unreadable
            }
            if (hash === this.hashContent(contents)) {
                existing = entry;
                break;
            }
        }
        if (existing) {
            if (!existing.aliases.includes(cleanName) && existing.name !== cleanName) {
                existing.aliases.push(cleanName);
                await this.saveIndex();
            }
            return existing;
        }
        // ────────────────────────────────────────────────────────────────────

        // Name collision?
        if (this.index.some(e => e.name === cleanName || e.aliases.includes(cleanName))) {
            throw new Error(`An icon named “${cleanName}” already exists.`);
        }

        // Write new file
        const filename = `${cleanName}.svg`;
        await fs.writeFile(path.join(this.iconsDir, filename), svg, "utf8");

        // Add to index
        const entry: CustomIconEntry = { name: cleanName, file: filename, aliases: [] };
        this.index.push(entry);
        await this.saveIndex();
        return entry;
    }


    /**
     * Remove a custom icon by primary name or alias.
     *
     * @param name  Primary name or any alias
     */
    async removeIcon(name: string): Promise<void> {
        const idx = this.index.findIndex(e => e.name === name || e.aliases.includes(name));
        if (idx < 0) {
            throw new Error(`No custom icon named “${name}” found.`);
        }
        const entry = this.index[idx];
        // If it's an alias, just remove alias
        if (entry.name !== name) {
            entry.aliases = entry.aliases.filter(a => a !== name);
        } else {
            // Primary: delete file and drop entry
            await fs.unlink(path.join(this.iconsDir, entry.file));
            this.index.splice(idx, 1);
        }
        await this.saveIndex();
    }

    /**
     * Rename a custom icon or alias.
     *
     * @param oldName existing primary or alias
     * @param newName new desired name
     */
    async renameIcon(oldName: string, newName: string): Promise<CustomIconEntry> {
        const cleanNew = this.sanitizeName(newName);
        const entry = this.index.find(e => e.name === oldName || e.aliases.includes(oldName));
        if (!entry) {
            throw new Error(`No custom icon named “${oldName}” found.`);
        }
        // Prevent collisions
        if (this.index.some(e => e.name === cleanNew || e.aliases.includes(cleanNew))) {
            throw new Error(`An icon named “${cleanNew}” already exists.`);
        }

        if (entry.name === oldName) {
            // Rename primary: rename file on disk and update entry
            const oldFile = path.join(this.iconsDir, entry.file);
            const newFile = `${cleanNew}.svg`;
            await fs.rename(oldFile, path.join(this.iconsDir, newFile));
            entry.file = newFile;
            entry.name = cleanNew;
        } else {
            // Rename alias only
            entry.aliases = entry.aliases.map(a => (a === oldName ? cleanNew : a));
        }
        await this.saveIndex();
        return entry;
    }

    /** Return a copy of the index. */
    listIcons(): CustomIconEntry[] {
        return this.index.map(e => ({ 
            name:    e.name, 
            file:    e.file, 
            aliases: [...e.aliases] 
        }));
    }
    
    /** Check whether a given name (primary or alias) exists in the index */
    public hasIcon(name: string): boolean {
        return this.index.some(e => e.name === name || e.aliases.includes(name));
    }
}
