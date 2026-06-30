import Dexie, { type Table } from 'dexie';
import { Website } from '../types';

export class NexusDB extends Dexie {
  websites!: Table<Website>;

  constructor() {
    super('NexusDB');
    this.version(1).stores({
      websites: 'id, name, url, category, favorite, pinned, lastOpened, createdAt'
    });
  }

  async incrementUsageCount(id: string) {
    const website = await this.websites.get(id);
    if (website) {
      await this.websites.update(id, { 
        usageCount: (website.usageCount || 0) + 1,
        lastOpened: Date.now()
      });
    }
  }
}

export const db = new NexusDB();

// Seed data
export const seedInitialData = async () => {
  const count = await db.websites.count();
  if (count === 0) {
    const initialWebsites: Website[] = [
      {
        id: '1',
        name: 'Google',
        url: 'https://google.com',
        category: 'Search',
        color: '#4285F4',
        favorite: true,
        usageCount: 0,
        pinned: true,
        tags: ['search', 'main'],
        description: 'Primary search engine',
        lastOpened: Date.now(),
        createdAt: Date.now(),
      },
      {
        id: '2',
        name: 'GitHub',
        url: 'https://github.com',
        category: 'Development',
        color: '#333',
        favorite: true,
        usageCount: 0,
        pinned: true,
        tags: ['code', 'git'],
        description: 'Code hosting',
        lastOpened: Date.now(),
        createdAt: Date.now(),
      },
      {
        id: '3',
        name: 'ChatGPT',
        url: 'https://chat.openai.com',
        category: 'AI',
        color: '#10A37F',
        favorite: true,
        usageCount: 0,
        pinned: true,
        tags: ['ai', 'chat'],
        description: 'AI assistant',
        lastOpened: Date.now(),
        createdAt: Date.now(),
      },
      {
        id: '4',
        name: 'YouTube',
        url: 'https://youtube.com',
        category: 'Entertainment',
        color: '#FF0000',
        favorite: false,
        usageCount: 0,
        pinned: false,
        tags: ['video', 'watch'],
        description: 'Video sharing',
        lastOpened: Date.now(),
        createdAt: Date.now(),
      },
      {
        id: '5',
        name: 'Figma',
        url: 'https://figma.com',
        category: 'Design',
        color: '#F24E1E',
        favorite: true,
        usageCount: 0,
        pinned: false,
        tags: ['design', 'ui'],
        description: 'Design tool',
        lastOpened: Date.now(),
        createdAt: Date.now(),
      }
    ];
    await db.websites.bulkPut(initialWebsites);
  }
};
