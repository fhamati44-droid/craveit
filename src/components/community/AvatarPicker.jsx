import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { AVATAR_KEYS, getAvatarGroups } from '@/lib/avatarSystem';
import TamamAvatarSVG from '@/components/community/TamamAvatarSVG';
import { updateMyAvatar } from '@/lib/communityMoodApi';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function AvatarPicker({ open, onClose, currentAvatar = { type: 'tamam', key: 'n1' }, onSaved, allowProfileImage = false, profileImageUrl = null }) {
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState(currentAvatar.type || 'tamam');
  const [selectedKey, setSelectedKey] = useState(currentAvatar.key || 'n1');
  const [displayName, setDisplayName] = useState(currentAvatar.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const groups = getAvatarGroups();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMyAvatar(selectedType, selectedKey, selectedType === 'profile' ? profileImageUrl : null, displayName || undefined);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
      if (onSaved) onSaved({ type: selectedType, key: selectedKey, url: selectedType === 'profile' ? profileImageUrl : null, displayName });
    } catch (err) {
      console.error(err);
    } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl max-h-[85vh] overflow-y-auto pb-safe"
            dir="rtl"
          >
            <div className="sticky top-0 bg-tamam-surface px-4 py-3 flex items-center justify-between border-b border-tamam-outline/20">
              <h2 className="text-tamam-text font-bold text-base">اختار صورتك</h2>
              <button onClick={onClose} className="p-1.5 rounded-full bg-tamam-surface-high text-tamam-text-muted">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="flex justify-center">
                {selectedType === 'profile' && profileImageUrl ? (
                  <img src={profileImageUrl} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-tamam-green/30" />
                ) : (
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-tamam-green/30">
                    <TamamAvatarSVG avatarKey={selectedKey} size={80} />
                  </div>
                )}
              </div>

              {/* Display name */}
              <div>
                <label className="text-tamam-text-muted text-xs font-semibold mb-1 block">الاسم الظاهر للناس</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                  placeholder="اكتب اسمك"
                  className="w-full bg-tamam-surface-low text-tamam-text text-sm rounded-lg px-3 py-2 border border-tamam-outline/30 focus:outline-none focus:border-tamam-green"
                />
              </div>

              {/* Avatar type toggle */}
              {allowProfileImage && profileImageUrl && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedType('tamam')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${selectedType === 'tamam' ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}
                  >
                    صورة TAMAM
                  </button>
                  <button
                    onClick={() => setSelectedType('profile')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${selectedType === 'profile' ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}
                  >
                    صورتي الشخصية
                  </button>
                </div>
              )}

              {/* Avatar grid */}
              {selectedType === 'tamam' && (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.key}>
                      <p className="text-tamam-text-muted text-[11px] font-semibold mb-1.5">{group.label}</p>
                      <div className="grid grid-cols-8 gap-2">
                        {AVATAR_KEYS.filter((k) => k.startsWith(group.key)).map((key) => (
                          <button
                            key={key}
                            onClick={() => { setSelectedType('tamam'); setSelectedKey(key); }}
                            className={`rounded-full overflow-hidden transition-all ${selectedKey === key ? 'ring-2 ring-tamam-green scale-105' : 'ring-1 ring-tamam-outline/20 opacity-80'}`}
                          >
                            <TamamAvatarSVG avatarKey={key} size={36} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
              >
                {saved ? <><Check size={16} /> تم الحفظ</> : saving ? 'جاري الحفظ...' : 'حفظ الصورة'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}