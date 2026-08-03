import TamamAvatar from './TamamAvatar';

export default function SupporterAvatarStack({ supporters = [], maxShow = 5, size = 28, extraCount = 0 }) {
  const shown = supporters.slice(0, maxShow);
  const extra = extraCount > 0 ? extraCount : supporters.length - shown.length;

  return (
    <div className="flex items-center -space-x-2 rtl:space-x-reverse">
      {shown.map((s, i) => (
        <TamamAvatar
          key={s.id || i}
          type={s.user_avatar_type || s.creator_avatar_type}
          avatarKey={s.user_avatar_key || s.creator_avatar_key}
          url={s.user_avatar_url || s.creator_avatar_url}
          size={size}
          className="ring-2 ring-tamam-surface"
        />
      ))}
      {extra > 0 && (
        <div
          className="flex items-center justify-center rounded-full bg-tamam-surface-high text-tamam-text-muted text-[10px] font-bold ring-2 ring-tamam-surface"
          style={{ width: size, height: size, minWidth: size }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}