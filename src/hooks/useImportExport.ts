import { db } from '../db/db';
import { useStore } from '../store/useStore';

export const useImportExport = () => {
  const { setSettings } = useStore();

  const exportData = async () => {
    const websites = await db.websites.toArray();
    const settings = useStore.getState().settings;
    
    const data = {
      version: '1.0.0',
      websites,
      settings,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.websites) {
            await db.websites.clear();
            await db.websites.bulkAdd(data.websites);
          }
          if (data.settings) {
            setSettings(data.settings);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return { exportData, importData };
};
