import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  listRestaurantsForAccess,
  createInvite, listInvites, resendInvite, revokeInvite, grantExisting,
  listMembers, revokeMembership,
} from '@/lib/partnerAccessApi';

const ROLE_LABEL = { owner: 'صاحب المطعم', manager: 'مدير', employee: 'موظف', demo_reviewer: 'مشاهد تجريبي' };
const EXPIRY_LABEL = { none: 'بدون انتهاء', '24h': '24 ساعة', '7d': '7 أيام', '30d': '30 يوم' };
const STATUS_LABEL = { pending: 'بانتظار', accepted: 'تم القبول', revoked: 'ملغاة', expired: 'منتهية' };

const ERROR_AR = {
  missing_fields: 'يرجى تعبئة كل الحقول',
  duplicate_invite: 'في دعوة فعّالة لهذا البريد على هذا المطعم',
  user_not_found: 'المستخدم غير موجود — أرسل الدعوة أولاً',
  already_member: 'المستخدم لديه صلاحية بالفعل',
  restaurant_not_found: 'المطعم غير موجود',
  demo_reviewer_requires_demo_restaurant: 'مشاهد تجريبي متاح فقط لمطعم تجريبي',
  invite_not_found: 'الدعوة غير موجودة',
  membership_not_found: 'الصلاحية غير موجودة',
  invite_not_resendable: 'لا يمكن إعادة إرسال هذه الدعوة',
  admin_only: 'هذه العملية للمشرفين فقط',
  auth_required: 'يجب تسجيل الدخول',
};

function errMsg(e) {
  const code = e?.error || e?.message || e?.data?.error;
  return ERROR_AR[code] || 'صار خطأ، حاول مرة ثانية';
}

export default function PartnerAccess() {
  const [restaurants, setRestaurants] = useState([]);
  const [rLoading, setRLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('owner');
  const [expiry, setExpiry] = useState('none');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const [demoEmail, setDemoEmail] = useState('');
  const [demoExpiry, setDemoExpiry] = useState('7d');
  const [demoBusy, setDemoBusy] = useState(false);

  const [invites, setInvites] = useState([]);
  const [members, setMembers] = useState([]);
  const [membersRestaurant, setMembersRestaurant] = useState(null);

  useEffect(() => {
    listRestaurantsForAccess().then((l) => {
      setRestaurants(l);
      const demo = l.find((r) => r.is_demo);
      if (demo) setSelected(demo.id);
    }).finally(() => setRLoading(false));
    reloadLists();
  }, []);

  const reloadLists = () => {
    listInvites().then(setInvites).catch(() => {});
    if (selected) listMembers(selected).then(setMembers).catch(() => {});
  };

  useEffect(() => {
    if (selected) {
      setMembersRestaurant(selected);
      listMembers(selected).then(setMembers).catch(() => setMembers([]));
    }
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => {
      const name = (r.name_ar || r.name || '').toLowerCase();
      const city = (r.city || '').toLowerCase();
      return name.includes(q) || city.includes(q);
    });
  }, [restaurants, search]);

  const sendInvite = async (payload) => {
    setBusy(true); setMsg(null);
    try {
      await createInvite(payload);
      setMsg({ type: 'success', text: 'تم إرسال الدعوة' });
      setEmail('');
      reloadLists();
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    } finally { setBusy(false); }
  };

  const sendDemo = async () => {
    const demo = restaurants.find((r) => r.is_demo);
    if (!demo) { setMsg({ type: 'error', text: 'مطعم تجريبي غير موجود' }); return; }
    if (!demoEmail.trim()) { setMsg({ type: 'error', text: 'يرجى إدخال البريد' }); return; }
    setDemoBusy(true); setMsg(null);
    try {
      await createInvite({ restaurant_id: demo.id, email: demoEmail, partner_role: 'demo_reviewer', expiry: demoExpiry });
      setMsg({ type: 'success', text: 'تم إرسال وصول تجريبي' });
      setDemoEmail('');
      reloadLists();
    } catch (e) {
      setMsg({ type: 'error', text: errMsg(e) });
    } finally { setDemoBusy(false); }
  };

  const onGrant = async (invite) => {
    if (!confirm(`منح الصلاحية الآن للمستخدم ${invite.email}؟`)) return;
    try {
      await grantExisting({ restaurant_id: invite.restaurant_id, email: invite.email, partner_role: invite.partner_role });
      setMsg({ type: 'success', text: 'المستخدم حصل على صلاحية الدخول' });
      reloadLists();
    } catch (e) { setMsg({ type: 'error', text: errMsg(e) }); }
  };
  const onRevokeInvite = async (id) => {
    if (!confirm('إلغاء هذه الدعوة؟')) return;
    try { await revokeInvite(id); setMsg({ type: 'success', text: 'تم إلغاء الوصول' }); reloadLists(); }
    catch (e) { setMsg({ type: 'error', text: errMsg(e) }); }
  };
  const onResend = async (id) => {
    try { await resendInvite(id); setMsg({ type: 'success', text: 'تم إعادة إرسال الدعوة' }); }
    catch (e) { setMsg({ type: 'error', text: errMsg(e) }); }
  };
  const onRevokeMember = async (id) => {
    if (!confirm('إلغاء صلاحية هذا المستخدم؟')) return;
    try { await revokeMembership(id); setMsg({ type: 'success', text: 'تم إلغاء الوصول' }); reloadLists(); }
    catch (e) { setMsg({ type: 'error', text: errMsg(e) }); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F5F5] max-w-2xl mx-auto pb-16">
      <div className="bg-white px-4 pt-10 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <Link to="/tamam-admin" className="flex items-center gap-1 text-gray-500 text-sm">
            <ArrowRight size={16} /> رجوع
          </Link>
          <h1 className="text-base font-extrabold">إدارة دخول أصحاب المطاعم</h1>
          <span className="w-6" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-bold ${msg.type === 'success' ? 'bg-green/10 text-green-dark' : 'bg-red-50 text-red-600'}`}>
            {msg.text}
          </div>
        )}

        {/* Demo quick action */}
        <section className="bg-white rounded-2xl p-4 border border-amber-200">
          <h2 className="font-bold text-sm mb-1">مشاركة مطعم البركة التجريبي</h2>
          <p className="text-[11px] text-gray-500 mb-3">وصول مشاهد تجريبي — للمطعم التجريبي فقط، لا يلمس بيانات العملاء.</p>
          <label className="block text-[11px] text-gray-500 mb-1">بريد Google</label>
          <input value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} type="email" dir="ltr" placeholder="example@gmail.com"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-3" />
          <label className="block text-[11px] text-gray-500 mb-1">انتهاء الصلاحية</label>
          <select value={demoExpiry} onChange={(e) => setDemoExpiry(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-3 bg-white">
            {Object.entries(EXPIRY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={sendDemo} disabled={demoBusy}
            className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            {demoBusy ? 'جاري…' : 'إرسال وصول تجريبي'}
          </button>
        </section>

        {/* Section 1 — invitation */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="font-bold text-sm mb-3">إرسال دعوة الدخول</h2>

          <label className="block text-[11px] text-gray-500 mb-1">اختيار المطعم</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المطعم أو المدينة"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-2" />
          <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50 mb-3">
            {rLoading && <p className="text-center text-gray-400 text-xs py-4">جاري التحميل…</p>}
            {!rLoading && filtered.length === 0 && <p className="text-center text-gray-400 text-xs py-4">لا توجد نتائج</p>}
            {filtered.map((r) => {
              const on = selected === r.id;
              return (
                <button key={r.id} onClick={() => setSelected(r.id)} type="button"
                  className={`w-full text-right px-3 py-2.5 flex items-center justify-between gap-2 ${on ? 'bg-blue/5' : ''}`}>
                  <span className="min-w-0">
                    <span className="font-bold text-sm block truncate">{r.name_ar || r.name}</span>
                    <span className="text-[11px] text-gray-400">{r.city || ''}</span>
                  </span>
                  {r.is_demo && <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">تجريبي</span>}
                </button>
              );
            })}
          </div>

          <label className="block text-[11px] text-gray-500 mb-1">البريد الإلكتروني</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" placeholder="example@gmail.com"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-3" />

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">نوع الدخول</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">الانتهاء</label>
              <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                {Object.entries(EXPIRY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <button onClick={() => sendInvite({ restaurant_id: selected, email, partner_role: role, expiry })}
            disabled={busy || !selected}
            className="w-full bg-blue text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            {busy ? 'جاري…' : 'إرسال دعوة الدخول'}
          </button>
        </section>

        {/* Invites list */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="font-bold text-sm mb-3">الدعوات</h2>
          {invites.length === 0 && <p className="text-center text-gray-400 text-xs py-4">لا توجد دعوات بعد</p>}
          <div className="space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-sm truncate" dir="ltr">{i.email}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${i.restaurant_is_demo ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{i.restaurant_is_demo ? 'تجريبي' : 'حقيقي'}</span>
                </div>
                <p className="text-[11px] text-gray-500">{i.restaurant_name} · {ROLE_LABEL[i.partner_role]} · {STATUS_LABEL[i.status]}</p>
                <p className="text-[11px] text-gray-400">
                  انتهاء: {i.expires_at ? new Date(i.expires_at).toLocaleDateString('ar') : 'بدون'} ·
                  {i.accepted_user_email ? ` قُبلت بواسطة ${i.accepted_user_email}` : ' بانتظار القبول'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {i.status === 'pending' && <button onClick={() => onResend(i.id)} className="text-[11px] font-bold text-blue px-2.5 py-1 rounded-lg bg-blue/5">إعادة إرسال</button>}
                  {i.status === 'pending' && <button onClick={() => onGrant(i)} className="text-[11px] font-bold text-green-dark px-2.5 py-1 rounded-lg bg-green/10">منح الآن</button>}
                  {(i.status === 'pending' || i.status === 'accepted') && <button onClick={() => onRevokeInvite(i.id)} className="text-[11px] font-bold text-red-500 px-2.5 py-1 rounded-lg bg-red-50">إلغاء</button>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Members for selected restaurant */}
        <section className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="font-bold text-sm mb-1">المستخدمون ذوو الصلاحية</h2>
          <p className="text-[11px] text-gray-500 mb-3">
            {membersRestaurant ? restaurants.find((r) => r.id === membersRestaurant)?.name_ar || '—' : 'اختر مطعمًا'}
          </p>
          {members.length === 0 && <p className="text-center text-gray-400 text-xs py-4">لا يوجد مستخدمون لهذا المطعم</p>}
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-sm block truncate" dir="ltr">{m.user_email || m.user_name || m.user_id}</span>
                  <span className="text-[11px] text-gray-500">{ROLE_LABEL[m.partner_role]} · {m.status === 'active' ? 'فعّال' : 'ملغاة'}{m.is_demo ? ' · تجريبي' : ''}</span>
                </div>
                {m.status === 'active' && (
                  <button onClick={() => onRevokeMember(m.id)} className="shrink-0 text-[11px] font-bold text-red-500 px-2.5 py-1 rounded-lg bg-red-50">إلغاء الوصول</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}