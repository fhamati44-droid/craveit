import { Link } from "react-router-dom";
import VerticalAdminShell from "@/components/admin/verticals/VerticalAdminShell";

const SCREENS = [
  { to: "/admin/verticals/list", icon: "category", title: "Menu Verticals", desc: "أنواع الأعمال والمنيوهات" },
  { to: "/admin/verticals/dayparts", icon: "schedule", title: "Vertical Daypart Strategies", desc: "استراتيجيات الفترات الزمنية" },
  { to: "/admin/verticals/playbooks", icon: "menu_book", title: "Vertical Campaign Playbooks", desc: "قوالب توصيات قابلة للتعديل" },
  { to: "/admin/verticals/assignment", icon: "link", title: "Restaurant Vertical Assignment", desc: "ربط المطاعم بالفيرتكالات" },
  { to: "/admin/verticals/overrides", icon: "tune", title: "Strategy Overrides", desc: "تجاوزات استراتيجية لكل مطعم" },
  { to: "/admin/verticals/recommendations", icon: "auto_awesome", title: "Campaign Recommendations", desc: "توصيات مولّدة كمسودات" },
  { to: "/admin/verticals/performance", icon: "bar_chart", title: "Vertical Performance Comparison", desc: "مقارنة أداء الفيرتكالات" },
];

export default function VerticalHub() {
  return (
    <VerticalAdminShell title="Menu Vertical Strategies" subtitle="طبقة الأعمال والاستراتيجية — مضافة بدون تغيير المنطق الحالي" backTo="/admin/group-deals">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SCREENS.map((s) => (
          <Link key={s.to} to={s.to} className="p-4 rounded-xl border bg-card flex items-center gap-3 hover:bg-muted/50 transition">
            <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">{s.icon}</span></span>
            <div className="min-w-0">
              <p className="font-bold text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </VerticalAdminShell>
  );
}