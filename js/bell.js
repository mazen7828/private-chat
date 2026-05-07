// =============================================
// Bell Ring System — Private Chat v2
// =============================================
// - زرار الجرس في الهيدر لكل مستخدم
// - يرسل إشعار realtime للطرف الآخر
// - الرنين يستمر حتى يضغط المُرسَل إليه "إيقاف"
// =============================================

let bellAudioCtx = null;
let bellOscillators = [];       // المذبذبات الجارية
let bellRingerInterval = null;  // interval يكرر صوت الجرس
let bellIsRinging = false;      // هل الرنين شغّال الآن عندي؟
let bellIRang = false;          // هل أنا اللي ضغطت الجرس؟
let bellChannel = null;         // Supabase realtime channel

// =============================================
// صوت الجرس — Web Audio API
// =============================================
function _bellCreateContext() {
    if (!bellAudioCtx) {
        bellAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return bellAudioCtx;
}

function _bellPlayTone(freq, startTime, duration, gain = 0.4) {
    const ctx = _bellCreateContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + duration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    bellOscillators.push(osc);
}

function _bellPlayChime() {
    const ctx = _bellCreateContext();
    const now = ctx.currentTime;

    // تتابع نغمات الجرس: ding-dong
    _bellPlayTone(880, now,        0.6, 0.5);
    _bellPlayTone(660, now + 0.35, 0.8, 0.45);
    _bellPlayTone(880, now + 0.85, 0.6, 0.4);
}

function _bellStopAllTones() {
    bellOscillators.forEach(osc => {
        try { osc.stop(); } catch(e) {}
    });
    bellOscillators = [];
}

function _bellStartRinging() {
    if (bellIsRinging) return;
    bellIsRinging = true;

    // شغّل على طول أول مرة
    _bellPlayChime();

    // وكرره كل 2.5 ثانية
    bellRingerInterval = setInterval(() => {
        if (bellIsRinging) _bellPlayChime();
    }, 2500);
}

function _bellStopRinging() {
    bellIsRinging = false;
    clearInterval(bellRingerInterval);
    bellRingerInterval = null;
    _bellStopAllTones();
}

// =============================================
// Supabase — إرسال واستقبال حدث الجرس
// =============================================
async function bellSendRing(ringerUser) {
    // أرسل حدث الجرس في جدول bell_ring
    await _supabase.from('bell_ring').upsert({
        id: 1,
        ringer: ringerUser,
        active: true,
        rung_at: Date.now()
    }, { onConflict: 'id' });
}

async function bellSendStop(stopperUser) {
    // المستقبِل يوقف الجرس — يسجّل الإيقاف
    await _supabase.from('bell_ring').upsert({
        id: 1,
        ringer: stopperUser,
        active: false,
        rung_at: Date.now()
    }, { onConflict: 'id' });
}

async function bellLoadCurrentState() {
    // اقرأ الحالة الحالية عند الدخول
    const { data } = await _supabase.from('bell_ring').select('*').eq('id', 1).single();
    return data;
}

function bellListenRealtime() {
    bellChannel = _supabase
        .channel('bell-ring-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'bell_ring' },
            ({ new: row }) => {
                if (!row) return;
                const me = getCurrentSender();
                if (!me) return;

                if (row.active && row.ringer !== me) {
                    // الطرف الآخر ضغط الجرس — ابدأ الرنين عندي
                    _bellStartRinging();
                    bellUpdateUI(true, false); // أنا مرنون عندي، لم أضغط أنا
                } else if (!row.active) {
                    // تم الإيقاف
                    _bellStopRinging();
                    bellIRang = false;
                    bellUpdateUI(false, false);
                }
            })
        .subscribe();
}

// =============================================
// واجهة المستخدم — زرار الجرس
// =============================================
function bellUpdateUI(ringing, iRang) {
    const btn = document.getElementById('bell-trigger-btn');
    const svgEl = document.getElementById('bell-icon-svg');
    const stopLabel = document.getElementById('bell-stop-label');
    const dot = document.getElementById('bell-ringing-dot');
    if (!btn) return;

    if (iRang) {
        // أنا اللي ضغطت → زر يتحول لـ"إيقاف"
        btn.classList.add('ringing');
        svgEl.style.display = 'inline';
        stopLabel.style.display = 'inline';
        dot.style.display = 'none';
    } else if (ringing) {
        // الطرف الآخر رنّ عندي → نقطة حمرا بس، بدون تغيير الزرار
        btn.classList.remove('ringing');
        svgEl.style.display = 'inline';
        stopLabel.style.display = 'none';
        dot.style.display = 'block';
    } else {
        // هادئ
        btn.classList.remove('ringing');
        svgEl.style.display = 'inline';
        stopLabel.style.display = 'none';
        dot.style.display = 'none';
    }
}

async function bellHandleClick() {
    const me = getCurrentSender();
    if (!me) {
        alert('اختار هويتك الأول');
        return;
    }

    if (bellIRang) {
        // أنا ضغطتُ الجرس قبل كده، والآن أوقفه
        await bellSendStop(me);
        bellIRang = false;
        bellUpdateUI(false, false);
    } else if (bellIsRinging) {
        // الجرس بيرن عندي (الطرف الآخر بعته) → إيقاف
        _bellStopRinging();
        await bellSendStop(me);
        bellUpdateUI(false, false);
    } else {
        // ابعت رنة للطرف الآخر
        bellIRang = true;
        await bellSendRing(me);
        bellUpdateUI(false, true); // أنا ضغطت
        // شغّل صوت خفيف عند المُرسِل (تأكيد)
        _bellPlayTone(880, _bellCreateContext().currentTime, 0.25, 0.2);
    }
}

// =============================================
// تهيئة
// =============================================
function bellInit() {
    const btn = document.getElementById('bell-trigger-btn');
    if (btn) {
        btn.addEventListener('click', bellHandleClick);
    }

    // استمع realtime
    bellListenRealtime();

    // اقرأ الحالة الحالية (هل الجرس كان شغّال قبل دخولي؟)
    bellLoadCurrentState().then(data => {
        if (!data || !data.active) return;
        const me = getCurrentSender();
        if (!me) return;
        if (data.ringer !== me) {
            // الطرف الآخر رنّ وأنا لسا مدخلتش
            _bellStartRinging();
            bellUpdateUI(true, false);
        }
    });
}

// شغّل bellInit بعد تحديد الهوية
const _origSetCurrentSender = window.setCurrentSender || null;

// انتظر حتى يتم تحديد الهوية ثم ابدأ
document.addEventListener('DOMContentLoaded', () => {
    // نشغّل bell بعد قليل لضمان تحميل كل الملفات
    setTimeout(() => {
        if (getCurrentSender()) {
            bellInit();
        }
    }, 1500);
});

// كذلك اعمل re-init لما يختار المستخدم هويته
window.bellReinitAfterIdentity = function () {
    bellInit();
};
