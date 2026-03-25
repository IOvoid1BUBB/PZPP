"use client";

import { useState, useEffect } from "react";
import { getAllTags, addTagToLead, removeTagFromLead, createTag } from "@/actions/leadTagsActions";

export default function LeadTagsManager({ leadId, initialLeadTags = [] }) {
  const [leadTags, setLeadTags] = useState(initialLeadTags);
  const [allAvailableTags, setAllAvailableTags] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Pobieramy wszystkie tagi z systemu przy załadowaniu komponentu
  useEffect(() => {
    async function fetchTags() {
      const tags = await getAllTags();
      setAllAvailableTags(tags);
    }
    fetchTags();
  }, []);

  const handleAssignTag = async (tagId) => {
    const result = await addTagToLead(leadId, tagId);
    if (result.success) {
      const addedTag = allAvailableTags.find(t => t.id === tagId);
      if (!leadTags.find(t => t.id === tagId)) {
        setLeadTags([...leadTags, addedTag]);
      }
    }
  };

  const handleRemoveTag = async (tagId) => {
    const result = await removeTagFromLead(leadId, tagId);
    if (result.success) {
      setLeadTags(leadTags.filter(t => t.id !== tagId));
    }
  };

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;
    const result = await createTag(newTagName, "#3b82f6"); // Domyślnie niebieski
    if (result.success) {
      setAllAvailableTags([...allAvailableTags, result.tag]);
      handleAssignTag(result.tag.id);
      setNewTagName("");
      setIsAdding(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Tagi Leada</h3>
      
      {/* Lista przypisanych tagów */}
      <div className="flex flex-wrap gap-2 mb-4">
        {leadTags.length === 0 && <span className="text-gray-400 text-sm">Brak tagów</span>}
        {leadTags.map(tag => (
          <span 
            key={tag.id} 
            className="px-2 py-1 text-xs font-bold text-white rounded-full flex items-center gap-1"
            style={{ backgroundColor: tag.color || '#64748b' }}
          >
            {tag.name}
            <button onClick={() => handleRemoveTag(tag.id)} className="ml-1 hover:text-red-200">
              &times;
            </button>
          </span>
        ))}
      </div>

      {/* Dodawanie nowego powiązania */}
      <div className="border-t pt-3">
        {isAdding ? (
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nazwa nowego tagu..." 
              className="border p-1 text-sm rounded w-full"
            />
            <button onClick={handleCreateNewTag} className="bg-blue-500 text-white px-2 py-1 rounded text-sm">Dodaj</button>
            <button onClick={() => setIsAdding(false)} className="text-gray-500 px-2 py-1 text-sm">Anuluj</button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <select 
              className="border p-1 text-sm rounded flex-grow"
              onChange={(e) => {
                if(e.target.value) handleAssignTag(e.target.value);
                e.target.value = ""; // Reset selecta
              }}
            >
              <option value="">-- Wybierz tag z bazy --</option>
              {allAvailableTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
            <button onClick={() => setIsAdding(true)} className="text-blue-500 text-sm font-medium hover:underline whitespace-nowrap">
              + Nowy Tag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}