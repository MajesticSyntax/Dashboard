import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Type, Tag as TagIcon, Hash, Plus, Check } from 'lucide-react';
import { Category, Website } from '../types';
import { useQueryClient } from '@tanstack/react-query';

interface AddWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWebsiteModal: React.FC<AddWebsiteModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { editingWebsiteId, setEditingWebsiteId, categories } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: 'Personal' as Category,
    tags: '' as string,
    description: '',
    color: '#3b82f6'
  });

  // Load website data if we are in edit mode
  useEffect(() => {
    const loadWebsiteData = async () => {
      if (isOpen && editingWebsiteId) {
        const website = await db.websites.get(editingWebsiteId);
        if (website) {
          setFormData({
            name: website.name || '',
            url: website.url || '',
            category: website.category || 'Personal',
            tags: Array.isArray(website.tags) ? website.tags.join(', ') : '',
            description: website.description || '',
            color: website.color || '#3b82f6'
          });
        }
      } else if (isOpen && !editingWebsiteId) {
        setFormData({
          name: '',
          url: '',
          category: 'Personal',
          tags: '',
          description: '',
          color: '#3b82f6'
        });
      }
    };
    loadWebsiteData();
  }, [isOpen, editingWebsiteId]);

  const handleClose = () => {
    setEditingWebsiteId(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTags = formData.tags.split(',').map(t => t.trim()).filter(t => t !== '');

    if (editingWebsiteId) {
      await db.websites.update(editingWebsiteId, {
        name: formData.name,
        url: formData.url,
        category: formData.category,
        color: formData.color,
        isCustomColor: true,
        description: formData.description,
        tags: parsedTags,
      });
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      queryClient.invalidateQueries({ queryKey: ['website', editingWebsiteId] });
    } else {
      const id = crypto.randomUUID();
      const website = {
        ...formData,
        id,
        isCustomColor: true,
        favorite: false,
        pinned: false,
        usageCount: 0,
        lastOpened: Date.now(),
        createdAt: Date.now(),
        tags: parsedTags,
      };

      await db.websites.add(website);
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    }

    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-xl glass-dark rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {editingWebsiteId ? 'Modify Node' : 'Expand Universe'}
                  </h2>
                  <p className="text-sm text-white/60">
                    {editingWebsiteId ? 'Update details of your connected node' : 'Connect a new node to your network'}
                  </p>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-3 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">Name</label>
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all text-white font-medium"
                        placeholder="e.g. Nexus"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">URL</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                      <input
                        required
                        type="url"
                        value={formData.url}
                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all text-white font-medium"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">Category</label>
                    <div className="relative">
                      <TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all appearance-none cursor-pointer text-white/95 font-medium"
                      >
                        {categories.map(cat => (
                          <option key={cat.name} value={cat.name} className="bg-[#0a0a0a] text-white py-2">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Plus className="w-4 h-4 text-white/50 rotate-45" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">Node Color</label>
                    <div className="relative flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span className="text-white/80 text-sm font-mono font-bold">{formData.color.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">Tags (Comma separated)</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                    <input
                      value={formData.tags}
                      onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all text-white font-medium"
                      placeholder="ai, dev, personal..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-[0.1em] px-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all resize-none text-white font-medium"
                    placeholder="Describe this node..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-3 rounded-2xl text-sm font-semibold text-white/70 hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-white text-black rounded-2xl text-sm font-bold hover:bg-white/90 transition-all shadow-xl flex items-center gap-2"
                  >
                    {editingWebsiteId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingWebsiteId ? 'Save Changes' : 'Create Node'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
