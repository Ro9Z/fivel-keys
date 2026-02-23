import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Wallet,
  Repeat,
  Clock,
  MessageCircle,
  ExternalLink,
  KeyRound,
  Info,
  Sparkles,
  ChevronDown,
  Calculator,
  Link as LinkIcon,
  AlertTriangle,
  Activity,
} from "lucide-react";

// =========================
// 1) ВПИШИ СВОИ ДАННЫЕ
// =========================
const BRAND = {
  name: "FiveL™ Keys",
  tagline: "TF2 ключи — быстро, прозрачно, без нервов",
};

const LINKS = {
  telegramBot: "https://t.me/fivel_key_bot",
  telegramSupport: "https://t.me/ro9zy",

  // пока нет — оставь пустыми строками, и кнопки/строки не будут показываться
  telegramChannel: "",

  // вместо TG-группы — Discord
  discord: "https://discord.gg/ppf7Zg2rw2", // например: "https://discord.gg/ppf7Zg2rw2"

  steamProfile: "https://steamcommunity.com/id/Ro9Z/",
  tradeLinkHelp: "https://steamcommunity.com/my/tradeoffers/privacy",
};

// ✅ ВКЛЮЧАЕМ LIVE ДАННЫЕ С ФАЙЛА public/status.json
const LIVE_DATA_ENDPOINT = "/status.json";

// значения по умолчанию (если live временно не читается)
const FALLBACK = {
  buyPrice: 170,
  sellPrice: 185,
  keysForSale: 40,
  keysWantBuy: 100,
  currency: "₽",
  updatedAt: "сегодня",
  updatedTs: 0,
};

// показывай кратко (полные реквизиты пусть выдаёт бот)
const PAYMENT = {
  label: "Оплата переводом на карту",
  detailsShort: "Т-Банк •••• 8094",
  note: "Полные реквизиты бот покажет после подтверждения заявки.",
};

// =========================
// РЕЖИМ РАБОТЫ (МСК)
// 10:00 — 24:00 МСК
// =========================
const MOSCOW_TZ = "Europe/Moscow";
const WORK_START_HOUR = 10; // 10:00
const WORK_END_HOUR = 24;   // 24:00 (= до 23:59)

// бот онлайн, если status.json обновлялся недавно
const BOT_ONLINE_THRESHOLD_SEC = 120;

// =========================
// UI helpers
// =========================
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(n) {
  try {
    return new Intl.NumberFormat("ru-RU").format(n);
  } catch {
    return String(n);
  }
}

function timeAgoRu(updatedTs) {
  if (!updatedTs) return "—";
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000 - updatedTs));

  if (diffSec < 10) return "только что";
  if (diffSec < 60) return `${diffSec} сек назад`;

  const min = Math.floor(diffSec / 60);
  if (min < 60) {
    // 1 мин, 2-4 мин, 5-20 мин...
    const last = min % 10;
    const last2 = min % 100;
    const word =
      last2 >= 11 && last2 <= 14
        ? "мин"
        : last === 1
          ? "мин"
          : last >= 2 && last <= 4
            ? "мин"
            : "мин";
    return `${min} ${word} назад`;
  }

  const h = Math.floor(min / 60);
  if (h < 24) {
    const last = h % 10;
    const last2 = h % 100;
    const word =
      last2 >= 11 && last2 <= 14
        ? "часов"
        : last === 1
          ? "час"
          : last >= 2 && last <= 4
            ? "часа"
            : "часов";
    return `${h} ${word} назад`;
  }

  const d = Math.floor(h / 24);
  const last = d % 10;
  const last2 = d % 100;
  const word =
    last2 >= 11 && last2 <= 14
      ? "дней"
      : last === 1
        ? "день"
        : last >= 2 && last <= 4
          ? "дня"
          : "дней";
  return `${d} ${word} назад`;
}

function getMoscowHour() {
  // Получаем текущий час в Москве через Intl
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "00";
  const h = Number(hourStr);
  return Number.isFinite(h) ? h : 0;
}

function formatMoscowTimeHM(date = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function StatPill({ icon: Icon, label, value, hint }) {
  return (
    <div className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-white/60">{label}</div>
        <div className="truncate text-base font-semibold tracking-tight">
          {value}
        </div>
      </div>
      {hint ? (
        <div className="pointer-events-none absolute -top-2 right-3 translate-y-[-100%] rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80 opacity-0 shadow-xl backdrop-blur transition group-hover:opacity-100">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  iconRight = true,
  disabled = false,
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/30";
  const styles = {
    primary:
      "bg-white text-slate-900 hover:bg-white/90 shadow-sm shadow-black/30",
    ghost: "bg-white/5 text-white hover:bg-white/10 border border-white/10",
    subtle: "bg-transparent text-white/80 hover:text-white hover:bg-white/5",
  };

  const disabledCls = disabled
    ? "opacity-50 pointer-events-none cursor-not-allowed"
    : "";

  const cls = cn(base, styles[variant], disabledCls, className);

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
        {iconRight ? <ExternalLink className="h-4 w-4 opacity-70" /> : null}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}

function SectionTitle({ kicker, title, desc }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
        <Sparkles className="h-4 w-4" />
        <span>{kicker}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
        {title}
      </div>
      {desc ? (
        <div className="mt-2 max-w-2xl text-sm text-white/70">{desc}</div>
      ) : null}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm shadow-black/30 backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-white">{q}</div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-white/70 transition",
            open ? "rotate-180" : "rotate-0"
          )}
        />
      </div>
      {open ? <div className="mt-3 text-sm text-white/70">{a}</div> : null}
    </button>
  );
}

// Кликабельная строка-кнопка (без отображения URL и без copy)
function LinkRow({ label, href, rightText = "Открыть" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
    >
      <div className="min-w-0">
        <div className="text-xs text-white/60">{label}</div>
        <div className="truncate text-sm font-semibold text-white">
          Нажмите, чтобы открыть
        </div>
      </div>

      <span className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white">
        {rightText} <ExternalLink className="ml-2 h-4 w-4 opacity-70" />
      </span>
    </a>
  );
}

function CalcInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        <Calculator className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-white/60">Калькулятор</div>
        <div className="mt-1 flex items-center gap-3">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="numeric"
            placeholder="Количество ключей"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20"
          />
        </div>
      </div>
    </div>
  );
}

function CalcResult({ label, total, currency, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-base font-semibold">
        {total == null ? "—" : `${formatNumber(total)} ${currency}`}
      </div>
      {hint ? <div className="mt-1 text-xs text-white/60">{hint}</div> : null}
    </div>
  );
}

function Warning({ text }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 text-sm text-white/80">
      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-200" />
      <div>{text}</div>
    </div>
  );
}

function StatusBadge({ openNow, botOnline }) {
  const text = `${openNow ? "Работаем сейчас" : "Сейчас закрыто"} • ${
    botOnline ? "Бот онлайн" : "Бот оффлайн"
  }`;
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80">
      <Activity className="h-4 w-4" />
      {text}
    </div>
  );
}

export default function App() {
  const [live, setLive] = useState(null);
  const [liveError, setLiveError] = useState(false);
  const particlesInit = async (engine) => {
  await loadFull(engine);
};

  // калькулятор
  const [qtyRaw, setQtyRaw] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!LIVE_DATA_ENDPOINT) return;
      try {
        const res = await fetch(LIVE_DATA_ENDPOINT, { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const json = await res.json();
        if (!cancelled) {
          setLive(json);
          setLiveError(false);
        }
      } catch {
        if (!cancelled) setLiveError(true);
      }
    }
    load();
    const t = setInterval(load, LIVE_DATA_ENDPOINT ? 30_000 : 1_000_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const stats = useMemo(() => {
    const d = live
      ? {
          buyPrice: Number(live.buy_price ?? FALLBACK.buyPrice),
          sellPrice: Number(live.sell_price ?? FALLBACK.sellPrice),
          keysForSale: Number(live.keys_for_sale ?? FALLBACK.keysForSale),
          keysWantBuy: Number(live.keys_want_buy ?? FALLBACK.keysWantBuy),
          currency: live.currency ?? FALLBACK.currency,
          updatedAt: live.updated_at ?? "только что",
          updatedTs: Number(live.updated_ts ?? 0),
        }
      : FALLBACK;

    return { ...d, spread: Math.max(0, d.sellPrice - d.buyPrice) };
  }, [live]);

  // ===== статус сервиса =====
  const moscowHour = useMemo(() => getMoscowHour(), [live, liveError]); // обновится при обновлениях
  const openNow = useMemo(() => {
    // hour 0..23, значит условие "до 24:00" = hour >= 10
    return moscowHour >= WORK_START_HOUR && moscowHour < WORK_END_HOUR;
  }, [moscowHour]);

  const botOnline = useMemo(() => {
    if (!stats.updatedTs) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec - stats.updatedTs <= BOT_ONLINE_THRESHOLD_SEC;
  }, [stats.updatedTs]);

  const qty = useMemo(() => {
    const cleaned = String(qtyRaw).replace(/[^\d]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }, [qtyRaw]);

  const calc = useMemo(() => {
    if (!qty) return { buyFromYou: null, sellToYou: null };
    return {
      buyFromYou: qty * stats.buyPrice,
      sellToYou: qty * stats.sellPrice,
    };
  }, [qty, stats.buyPrice, stats.sellPrice]);

  const exceedsSale = qty != null && qty > stats.keysForSale;
  const exceedsBuy = qty != null && qty > stats.keysWantBuy;
  const blockOrder = exceedsSale || exceedsBuy;

  const steps = [
    {
      icon: Wallet,
      title: "Купить ключи",
      text: "Выберите количество → получите сумму и реквизиты → «Я оплатил» → отправьте trade-ссылку.",
    },
    {
      icon: Repeat,
      title: "Продать ключи",
      text: "Выберите количество → отправьте trade-ссылку → получите трейд → после получения ключей сделаю перевод.",
    },
    {
      icon: ShieldCheck,
      title: "Прозрачные статусы",
      text: "Заявка получает номер и статусы. В случае вопросов всё сохраняется.",
    },
  ];

  const faq = [
    {
      q: "График работы?",
      a: "Ежедневно с 10:00 до 24:00 по МСК. Вне графика заявки можно оставить, обработаю в ближайшее рабочее время.",
    },
    {
      q: "Где взять trade-ссылку?",
      a: "Откройте Steam → Трейды → Настройки приватности трейдов. Там будет «Trade Offer URL». На сайте есть кнопка, которая ведёт прямо туда.",
    },
    {
      q: "Можно оплатить скриншотом?",
      a: "Нет. Учитывается только реальное поступление средств.",
    },
  ];

	return (
	<div className="relative min-h-screen bg-[#060a14] text-white flex flex-col justify-start">
		<div className="pointer-events-none fixed inset-0 z-[1]">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            detectRetina: true,
            interactivity: {
              events: {
                onHover: { enable: true, mode: "repulse" },
                onClick: { enable: true, mode: "push" },
                resize: true,
              },
              modes: {
                repulse: { distance: 140, duration: 0.35 },
                push: { quantity: 2 },
              },
            },
            particles: {
              number: { value: 90, density: { enable: true, area: 900 } },
              color: { value: ["#e6f6ff", "#c8d6ff", "#b9f3ff"] },
              opacity: { value: 0.85 },
              size: { value: { min: 1.5, max: 3.5 } },
              move: { enable: true, speed: 1.2, direction: "none", outModes: "out" },
              links: { enable: true, distance: 170, opacity: 0.28, width: 1 },
            },
          }}
          style={{ position: "absolute", inset: 0 }}
        />
      </div>

          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-25%] left-[-10%] h-[520px] w-[520px] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:24px_24px] opacity-60" />
      </div>

      <header className="relative z-10 w-full px-5 py-5"><div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">{BRAND.name}</div>
            <div className="text-xs text-white/60">{BRAND.tagline}</div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {LINKS.telegramChannel ? (
            <Button variant="ghost" href={LINKS.telegramChannel}>Отзывы</Button>
          ) : null}
          {LINKS.discord ? (
            <Button variant="ghost" href={LINKS.discord}>Discord</Button>
          ) : null}
          <Button variant="primary" href={LINKS.telegramBot}>Открыть бота</Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button variant="primary" href={LINKS.telegramBot}>Бот</Button>
        </div>
      </div></header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <StatusBadge openNow={openNow} botOnline={botOnline} />
          <div className="text-xs text-white/60">
            Время МСК: {formatMoscowTimeHM()} • График: 10:00–24:00
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-semibold tracking-tight md:text-5xl"
            >
              Покупка и продажа ключей TF2
              <span className="block text-white/70">быстро • прозрачно • удобно</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base"
            >
              Всё через Telegram-бота: сумма считается автоматически, заявки получают номер и статусы.
            </motion.p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="primary" href={LINKS.telegramBot}>Начать сделку</Button>
              <Button variant="ghost" href={LINKS.telegramSupport}>Поддержка</Button>
              {LINKS.telegramChannel ? (
                <Button variant="ghost" href={LINKS.telegramChannel}>Отзывы/новости</Button>
              ) : null}
              {LINKS.discord ? (
                <Button variant="ghost" href={LINKS.discord}>Discord</Button>
              ) : null}
              <Button variant="ghost" href={LINKS.tradeLinkHelp}>Где взять trade-ссылку?</Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <StatPill icon={Wallet} label="Покупаю у вас" value={`${formatNumber(stats.buyPrice)} ${stats.currency} / ключ`} />
              <StatPill icon={Repeat} label="Продаю вам" value={`${formatNumber(stats.sellPrice)} ${stats.currency} / ключ`} />
              <StatPill icon={KeyRound} label="В наличии" value={`${formatNumber(stats.keysForSale)} ключ(ей)`} />
              <StatPill icon={ShieldCheck} label="Готов купить" value={`${formatNumber(stats.keysWantBuy)} ключ(ей)`} />
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
              <Clock className="h-4 w-4" />
              <span>
                {liveError
					? "Live: ошибка чтения /status.json"
					: `Обновлено: ${timeAgoRu(stats.updatedTs)}`}
              </span>
            </div>

            <div className="mt-6">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Калькулятор суммы</div>
                    <div className="mt-1 text-sm text-white/70">
                      Введите количество ключей — покажет итог по текущим ценам.
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <Calculator className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <CalcInput value={qtyRaw} onChange={setQtyRaw} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CalcResult
                      label="Если вы ПРОДАЁТЕ мне (я покупаю у вас)"
                      total={calc.buyFromYou}
                      currency={stats.currency}
                      hint={`Цена: ${formatNumber(stats.buyPrice)} ${stats.currency}/ключ • Лимит: до ${formatNumber(stats.keysWantBuy)} ключ(ей)`}
                    />
                    <CalcResult
                      label="Если вы ПОКУПАЕТЕ у меня (я продаю вам)"
                      total={calc.sellToYou}
                      currency={stats.currency}
                      hint={`Цена: ${formatNumber(stats.sellPrice)} ${stats.currency}/ключ • В наличии: ${formatNumber(stats.keysForSale)} ключ(ей)`}
                    />
                  </div>

                  {qty != null && exceedsSale ? (
                    <Warning text={`Вы ввели ${formatNumber(qty)}. В наличии только ${formatNumber(stats.keysForSale)}.`} />
                  ) : null}
                  {qty != null && exceedsBuy ? (
                    <Warning text={`Вы ввели ${formatNumber(qty)}. Сейчас я готов купить максимум ${formatNumber(stats.keysWantBuy)}.`} />
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" href={LINKS.tradeLinkHelp} iconRight={false}>
                      <LinkIcon className="h-4 w-4 opacity-80" />
                      Где взять trade-ссылку
                    </Button>
                    <Button variant="primary" href={LINKS.telegramBot} disabled={blockOrder}>
                      Оформить в боте
                    </Button>
                  </div>

                  {blockOrder ? (
                    <div className="text-xs text-white/60">
                      Кнопка заблокирована: количество больше лимита/наличия.
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>

          <div className="md:col-span-5">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Как это работает</div>
                  <div className="mt-1 text-sm text-white/70">3 шага — и сделка готова.</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Info className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{s.title}</div>
                      <div className="mt-1 text-sm text-white/70">{s.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                <LinkRow label="Telegram бот" href={LINKS.telegramBot} />
                <LinkRow label="Поддержка" href={LINKS.telegramSupport} />
                {LINKS.discord ? <LinkRow label="Discord" href={LINKS.discord} /> : null}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <SectionTitle
              kicker="Комфорт"
              title="Прозрачность и удобство"
              desc="Если возникнет вопрос — всегда можно быстро уточнить в поддержке."
            />
          </div>

          <div className="md:col-span-5">
            <SectionTitle kicker="Оплата" title={PAYMENT.label} desc="На сайте — кратко. Полные реквизиты выдаёт бот." />
            <Card>
              <div className="text-sm text-white/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-white/60">Реквизиты (кратко)</div>
                    <div className="mt-1 text-base font-semibold text-white">{PAYMENT.detailsShort}</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-sm">{PAYMENT.note}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" href={LINKS.telegramBot}>Оформить в боте</Button>
                  <Button variant="ghost" href={LINKS.telegramSupport}>Задать вопрос</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <SectionTitle kicker="FAQ" title="Частые вопросы" />
            <div className="grid gap-3">
              {faq.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>

          <div className="md:col-span-5">
            <SectionTitle kicker="Контакты" title="Связь и ссылки" />
            <Card>
              <div className="grid gap-3">
                <LinkRow label="Telegram бот" href={LINKS.telegramBot} />
                <LinkRow label="Поддержка" href={LINKS.telegramSupport} />
                {LINKS.telegramChannel ? <LinkRow label="Канал" href={LINKS.telegramChannel} /> : null}
                {LINKS.discord ? <LinkRow label="Discord" href={LINKS.discord} /> : null}
                {LINKS.steamProfile ? <LinkRow label="Steam" href={LINKS.steamProfile} /> : null}
                <LinkRow label="Где взять trade-ссылку?" href={LINKS.tradeLinkHelp} rightText="Открыть Steam" />
              </div>
            </Card>
          </div>
        </div>

        <footer className="mt-14 border-t border-white/10 py-10">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="text-sm text-white/60">
              © {new Date().getFullYear()} {BRAND.name}. График: 10:00–24:00 МСК.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" href={LINKS.telegramBot}>Бот</Button>
              {LINKS.telegramChannel ? <Button variant="ghost" href={LINKS.telegramChannel}>Отзывы</Button> : null}
              <Button variant="ghost" href={LINKS.telegramSupport}>Поддержка</Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}