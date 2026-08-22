import fs from "node:fs/promises";
import path from "node:path";
import {
  Presentation,
  PresentationFile,
  layers,
  shape,
  text,
} from "@oai/artifact-tool";

const W = 1280;
const H = 720;
const OUT_DIR = "C:/Users/DELL/Documents/Codex/2026-08-19/referenced-chatgpt-conversation-this-is-an/outputs";
const PREVIEW_DIR = "C:/Users/DELL/Documents/Codex/2026-08-19/referenced-chatgpt-conversation-this-is-an/work/napri-launch-deck/rendered";
const PPTX_PATH = path.join(OUT_DIR, "ميلاد-نظام-نبري-المرحلة-الأولى.pptx");

const C = {
  ink: "#14231C",
  green: "#123C2D",
  green2: "#1D5A43",
  lime: "#D9EF9F",
  lime2: "#EEF7D7",
  gold: "#C7963B",
  cream: "#F7F4EC",
  white: "#FFFFFF",
  gray: "#66716B",
  gray2: "#D7DDD9",
  gray3: "#EBEFEC",
  red: "#A14D45",
};

const FONT = "Arial";

function writeBlob(filePath, blob) {
  return blob.arrayBuffer().then((buffer) => fs.writeFile(filePath, new Uint8Array(buffer)));
}

function txt(value, left, top, width, height, opts = {}) {
  return text([value], {
    position: { left, top },
    width,
    height,
    style: {
      fontSize: opts.fontSize ?? "22px",
      typeface: FONT,
      color: opts.color ?? C.ink,
      bold: opts.bold ?? false,
      alignment: opts.alignment ?? "right",
      verticalAlignment: opts.verticalAlignment ?? "top",
      autoFit: opts.autoFit ?? "shrinkText",
      wrap: "square",
      insets: opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
    },
  });
}

function box(left, top, width, height, fill, opts = {}) {
  return shape({
    geometry: opts.geometry ?? "roundRect",
    fill,
    line: {
      style: "solid",
      width: opts.lineWidth ?? 0,
      fill: opts.lineFill ?? "none",
    },
    position: { left, top },
    width,
    height,
  });
}

function line(left, top, width, height, fill = C.green, thickness = 2) {
  if (width < 0) {
    left += width;
    width = Math.abs(width);
  }
  if (height < 0) {
    top += height;
    height = Math.abs(height);
  }
  width = Math.max(width, 0.01);
  height = Math.max(height, 0.01);
  return shape({
    geometry: "straightConnector1",
    fill: "none",
    line: { style: "solid", width: thickness, fill },
    position: { left, top },
    width,
    height,
  });
}

function circle(left, top, size, fill, opts = {}) {
  return box(left, top, size, size, fill, {
    geometry: "ellipse",
    lineWidth: opts.lineWidth ?? 0,
    lineFill: opts.lineFill ?? "none",
  });
}

function composeSlide(presentation, elements, notes) {
  const slide = presentation.slides.add();
  slide.background.fill = C.cream;
  slide.compose(
    layers({ name: "napri-phase-one", width: "fill", height: "fill" }, elements),
    { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 1 },
  );
  slide.speakerNotes.textFrame.setText(notes);
  slide.speakerNotes.setVisible(true);
  return slide;
}

function chrome(slideNo, kicker, title, subtitle = "") {
  return [
    box(0, 0, W, 9, C.lime, { geometry: "rect" }),
    txt(kicker, 894, 34, 310, 28, {
      fontSize: "15px",
      color: C.green2,
      bold: true,
    }),
    txt(title, 74, 66, 1130, 70, {
      fontSize: "44px",
      color: C.ink,
      bold: true,
    }),
    subtitle
      ? txt(subtitle, 74, 138, 1130, 54, {
          fontSize: "21px",
          color: C.gray,
        })
      : null,
    line(74, 666, 1130, 0, C.gray2, 1),
    txt(String(slideNo).padStart(2, "0"), 74, 678, 60, 22, {
      fontSize: "13px",
      color: C.gray,
      alignment: "left",
    }),
    txt("نبري · المرحلة الأولى", 978, 678, 226, 22, {
      fontSize: "13px",
      color: C.gray,
    }),
  ].filter(Boolean);
}

function notes(body, source = "نظام نبري المحلي واختبارات المرحلة الأولى، 21 أغسطس 2026") {
  return `${body}\n\n[Sources]\n- ${source}\n[/Sources]`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });

  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  composeSlide(
    presentation,
    [
      box(0, 0, W, H, C.cream, { geometry: "rect" }),
      box(728, 0, 552, H, C.green, { geometry: "rect" }),
      box(728, 0, 18, H, C.lime, { geometry: "rect" }),
      txt("عرض خاص للسيد غسان جيلاني", 74, 60, 560, 34, {
        fontSize: "17px",
        color: C.green2,
        bold: true,
      }),
      txt("ميلاد\nنظام نبري", 74, 150, 570, 210, {
        fontSize: "76px",
        color: C.ink,
        bold: true,
      }),
      txt("من طلب العميل إلى التحصيل — في مسار واحد", 74, 390, 570, 64, {
        fontSize: "28px",
        color: C.gray,
      }),
      box(74, 520, 420, 60, C.lime, { geometry: "roundRect" }),
      txt("المرحلة الأولى · قابلة للتجربة الآن", 97, 537, 374, 32, {
        fontSize: "20px",
        color: C.green,
        bold: true,
      }),
      txt("21 أغسطس 2026", 74, 640, 300, 28, {
        fontSize: "15px",
        color: C.gray,
        alignment: "left",
      }),
      circle(874, 132, 256, C.lime),
      txt("نبري", 892, 210, 220, 90, {
        fontSize: "68px",
        color: C.green,
        bold: true,
        alignment: "center",
        verticalAlignment: "middle",
      }),
      txt("SALES · DISTRIBUTION", 862, 310, 244, 28, {
        fontSize: "15px",
        color: C.lime2,
        bold: true,
        alignment: "center",
      }),
      txt("نسخة تشغيلية، لا مجرد تصور", 798, 560, 408, 60, {
        fontSize: "26px",
        color: C.white,
        bold: true,
        alignment: "center",
      }),
    ],
    notes(
      "ابدأ بهذه الجملة: اليوم لا نعرض فكرة نظرية؛ نحن نعرض أول نسخة تشغيلية من نظام نبري. الهدف من اللقاء هو تجربة الرحلة كاملة، ثم اعتماد قائمة الأسعار وتحديد أول مجموعة عملاء للتشغيل.",
    ),
  );

  composeSlide(
    presentation,
    [
      ...chrome(2, "من التشتت إلى السيطرة", "لماذا احتجنا هذا النظام؟", "المشكلة ليست نقص المعلومات؛ بل انفصالها عن قرار البيع اليومي."),
      box(74, 228, 512, 342, C.white, { lineWidth: 1, lineFill: C.gray2 }),
      txt("قبل", 486, 254, 70, 34, { fontSize: "18px", color: C.red, bold: true }),
      txt("ملفات وحسابات\nمتفرقة", 116, 292, 398, 98, {
        fontSize: "38px",
        color: C.ink,
        bold: true,
      }),
      txt("• السعر قد يختلف بين الطلب والتسجيل\n• حالة الطلب لا تظهر للجميع\n• التحصيل منفصل عن تاريخ العميل", 116, 420, 398, 116, {
        fontSize: "21px",
        color: C.gray,
      }),
      box(620, 228, 584, 342, C.green),
      txt("الآن", 1088, 254, 84, 34, { fontSize: "18px", color: C.lime, bold: true }),
      txt("دورة بيع\nواحدة ومشتركة", 666, 292, 464, 98, {
        fontSize: "38px",
        color: C.white,
        bold: true,
      }),
      txt("العميل ← الطلب ← الإدارة ← المندوب ← التحصيل", 666, 425, 464, 40, {
        fontSize: "23px",
        color: C.lime,
        bold: true,
      }),
      txt("كل دور يرى ما يحتاجه فقط، من نفس البيانات.", 666, 486, 464, 54, {
        fontSize: "21px",
        color: C.lime2,
      }),
    ],
    notes(
      "اشرح أن النظام لا يلغي الخبرة الحالية ولا يطلب تغيير الشركة دفعة واحدة. هو يجمع خطوات البيع الأساسية في مكان واحد حتى يصبح القرار أسرع، والسعر واحدًا، والمتابعة واضحة.",
    ),
  );

  composeSlide(
    presentation,
    [
      ...chrome(3, "ما يعمل اليوم", "ثلاث واجهات — مصدر بيانات واحد", "كل واجهة بمهام يومها، بينما الطلبات والأسعار والتحصيلات مترابطة في الخلفية."),
      box(74, 240, 348, 324, C.green),
      circle(104, 270, 66, C.lime),
      txt("01", 104, 287, 66, 30, { fontSize: "20px", color: C.green, bold: true, alignment: "center" }),
      txt("الإدارة", 106, 360, 286, 44, { fontSize: "34px", color: C.white, bold: true }),
      txt("لوحة المبيعات\nالعملاء والطلبات\nقائمة الأسعار والمخزون\nالتحصيل وهيكل الشركة", 106, 420, 286, 118, {
        fontSize: "20px",
        color: C.lime2,
      }),
      box(466, 240, 348, 324, C.white, { lineWidth: 1, lineFill: C.gray2 }),
      circle(496, 270, 66, C.green),
      txt("02", 496, 287, 66, 30, { fontSize: "20px", color: C.lime, bold: true, alignment: "center" }),
      txt("المندوب / الموظف", 498, 360, 286, 44, { fontSize: "31px", color: C.ink, bold: true }),
      txt("مسار الزيارات\nأولوية العملاء\nطلبات وتحصيلات\nتحديث حالة التنفيذ", 498, 420, 286, 118, {
        fontSize: "20px",
        color: C.gray,
      }),
      box(858, 240, 346, 324, C.lime2),
      circle(888, 270, 66, C.gold),
      txt("03", 888, 287, 66, 30, { fontSize: "20px", color: C.white, bold: true, alignment: "center" }),
      txt("العميل", 890, 360, 284, 44, { fontSize: "34px", color: C.ink, bold: true }),
      txt("كتالوج المنتجات\nالسعر الموحد\nسلة الطلب\nإرسال الطلب ومتابعته", 890, 420, 284, 118, {
        fontSize: "20px",
        color: C.green,
      }),
    ],
    notes(
      "اعرض الواجهات بالترتيب: الإدارة ثم المندوب ثم العميل. ركّز على أن الاختلاف في الشاشة لا يعني اختلاف البيانات؛ الطلب الذي يرسله العميل يظهر لدى الإدارة، ويصبح جزءًا من عمل المندوب.",
    ),
  );

  composeSlide(
    presentation,
    [
      ...chrome(4, "نقطة التحكم", "قائمة الأسعار مرتبطة بالنظام كله", "السعر لا يُنسخ يدويًا بين الواجهات؛ النظام يعيد التحقق منه قبل حفظ الطلب."),
      circle(488, 230, 304, C.green),
      txt("قائمة الأسعار", 530, 296, 220, 42, {
        fontSize: "30px",
        color: C.white,
        bold: true,
        alignment: "center",
      }),
      txt("NAPRI-P1-2026-08", 525, 360, 230, 36, {
        fontSize: "19px",
        color: C.lime,
        bold: true,
        alignment: "center",
      }),
      txt("المصدر الواحد", 530, 416, 220, 34, {
        fontSize: "21px",
        color: C.lime2,
        alignment: "center",
      }),
      line(488, 380, -170, -98, C.green2, 3),
      line(792, 380, 170, -98, C.green2, 3),
      line(488, 430, -170, 98, C.green2, 3),
      line(792, 430, 170, 98, C.green2, 3),
      box(86, 218, 270, 108, C.white, { lineWidth: 1, lineFill: C.gray2 }),
      txt("واجهة الإدارة", 112, 246, 218, 30, { fontSize: "23px", color: C.ink, bold: true }),
      txt("تحديث ورقابة", 112, 283, 218, 24, { fontSize: "17px", color: C.gray }),
      box(924, 218, 270, 108, C.lime2),
      txt("واجهة العميل", 950, 246, 218, 30, { fontSize: "23px", color: C.ink, bold: true }),
      txt("عرض وطلب", 950, 283, 218, 24, { fontSize: "17px", color: C.green }),
      box(86, 482, 270, 108, C.lime2),
      txt("واجهة المندوب", 112, 510, 218, 30, { fontSize: "23px", color: C.ink, bold: true }),
      txt("بيع وتحصيل", 112, 547, 218, 24, { fontSize: "17px", color: C.green }),
      box(924, 482, 270, 108, C.white, { lineWidth: 1, lineFill: C.gray2 }),
      txt("قاعدة البيانات", 950, 510, 218, 30, { fontSize: "23px", color: C.ink, bold: true }),
      txt("تحقق قبل الحفظ", 950, 547, 218, 24, { fontSize: "17px", color: C.gray }),
    ],
    notes(
      "هذه أهم شريحة في العرض. وضّح أن العميل والمندوب لا يحددان السعر من عندهما. السعر يأتي من قائمة واحدة، وعند إرسال الطلب يراجع الخادم السعر والمخزون قبل تسجيل العملية. القرار المطلوب من غسان: اعتماد نسخة الأسعار الأولى أو تحديد تعديلات واضحة عليها.",
    ),
  );

  composeSlide(
    presentation,
    [
      ...chrome(5, "دورة البيع", "رحلة واحدة من الطلب إلى التحصيل", "المرحلة الأولى تغطي المسار الذي نحتاجه لتشغيل البيع فعليًا."),
      line(128, 356, 1022, 0, C.green, 3),
      ...[
        { x: 128, n: "1", label: "اختيار المنتجات", detail: "العميل أو المندوب" },
        { x: 383, n: "2", label: "تسجيل الطلب", detail: "سعر ومخزون مُتحقق" },
        { x: 638, n: "3", label: "مراجعة الإدارة", detail: "قبول وتحديث الحالة" },
        { x: 893, n: "4", label: "التجهيز والتسليم", detail: "متابعة تنفيذ الطلب" },
        { x: 1148, n: "5", label: "التحصيل", detail: "تحديث رصيد العميل" },
      ].flatMap((s, index) => [
        circle(s.x - 30, 326, 60, index === 4 ? C.gold : C.green),
        txt(s.n, s.x - 30, 342, 60, 28, {
          fontSize: "20px",
          color: index === 4 ? C.white : C.lime,
          bold: true,
          alignment: "center",
        }),
        txt(s.label, s.x - 105, index % 2 === 0 ? 236 : 412, 210, 50, {
          fontSize: "22px",
          color: C.ink,
          bold: true,
          alignment: "center",
          verticalAlignment: "middle",
        }),
        txt(s.detail, s.x - 105, index % 2 === 0 ? 286 : 462, 210, 48, {
          fontSize: "16px",
          color: C.gray,
          alignment: "center",
        }),
      ]),
      box(404, 550, 472, 62, C.lime),
      txt("كل خطوة تترك أثرًا يمكن الرجوع إليه", 432, 568, 416, 30, {
        fontSize: "20px",
        color: C.green,
        bold: true,
        alignment: "center",
      }),
    ],
    notes(
      "مرّ على الخطوات الخمس بسرعة. الهدف هو إظهار أن النظام ليس شاشة طلب فقط؛ إنه يحفظ حالة العمل حتى نعرف أين توقف الطلب وما الذي تم تحصيله من العميل.",
    ),
  );

  composeSlide(
    presentation,
    [
      ...chrome(6, "حدود المرحلة الأولى", "ننفذ الضروري الآن — ونؤجل الباقي بوضوح", "الأيقونة المؤجلة لا تكون ميتة؛ تشرح ما يلزم لتفعيلها عندما يحين وقتها."),
      box(74, 226, 548, 352, C.green),
      txt("يعمل في المرحلة الأولى", 110, 258, 474, 42, {
        fontSize: "30px",
        color: C.white,
        bold: true,
      }),
      txt("✓ الطلبات وتحديث حالتها\n✓ قائمة الأسعار والمخزون\n✓ العملاء والمندوبون والمسارات\n✓ تسجيل التحصيلات\n✓ واجهات الإدارة والمندوب والعميل", 110, 330, 474, 200, {
        fontSize: "23px",
        color: C.lime2,
      }),
      box(658, 226, 546, 352, C.white, { lineWidth: 1, lineFill: C.gray2 }),
      txt("مؤجل مع متطلبات واضحة", 694, 258, 474, 42, {
        fontSize: "30px",
        color: C.ink,
        bold: true,
      }),
      txt("التسويق الآلي — يحتاج قنوات ومحتوى\nGPS — يحتاج عناوين وإحداثيات\nالحسابات والصلاحيات — تحتاج تعريف المستخدمين\nالمخزون المتقدم — يحتاج جردًا وإجراءات اعتماد", 694, 330, 474, 170, {
        fontSize: "21px",
        color: C.gray,
      }),
      box(694, 516, 422, 42, C.lime2),
      txt("تأجيل منظم، وليس وظيفة معطلة", 716, 527, 378, 25, {
        fontSize: "17px",
        color: C.green,
        bold: true,
        alignment: "center",
      }),
    ],
    notes(
      "استخدم هذه الشريحة لضبط التوقعات. نحن لا نخفي الوظائف المستقبلية، ولا نسمح لها بتشتيت التشغيل الأول. عند فتح أي وظيفة مؤجلة يظهر ما تحتاجه لتصبح قابلة للتفعيل.",
    ),
  );

  composeSlide(
    presentation,
    [
      ...chrome(7, "تجربة الاجتماع", "سنثبت أن النظام يعمل في خمس دقائق", "نفذ الرحلة أمام غسان من واجهة العميل، ثم ارجع إلى الإدارة والمندوب."),
      box(74, 222, 760, 380, C.white, { lineWidth: 1, lineFill: C.gray2 }),
      ...[
        ["1", "افتح واجهة العميل واختر منتجًا"],
        ["2", "أرسل الطلب بالسعر الظاهر"],
        ["3", "افتح الإدارة وشاهد الطلب الجديد"],
        ["4", "حدّث الحالة إلى قيد التجهيز"],
        ["5", "سجل تحصيلًا وراجع رصيد العميل"],
      ].flatMap((row, i) => [
        circle(112, 250 + i * 66, 42, i === 4 ? C.gold : C.green),
        txt(row[0], 112, 260 + i * 66, 42, 22, {
          fontSize: "16px",
          color: C.white,
          bold: true,
          alignment: "center",
        }),
        txt(row[1], 174, 254 + i * 66, 604, 38, {
          fontSize: "22px",
          color: C.ink,
          bold: i === 0,
        }),
        i < 4 ? line(112, 310 + i * 66, 666, 0, C.gray3, 1) : null,
      ].filter(Boolean)),
      box(870, 222, 334, 380, C.green),
      txt("نسخة العرض المؤقتة", 904, 264, 266, 32, {
        fontSize: "24px",
        color: C.lime,
        bold: true,
      }),
      txt("napri-sales-phase-one-2026\n.logman-gelany.chatgpt.site", 904, 326, 266, 96, {
        fontSize: "19px",
        color: C.white,
        alignment: "left",
      }),
      box(904, 454, 266, 78, C.lime2),
      txt("الدخول خاص بالمالك حاليًا", 922, 474, 230, 38, {
        fontSize: "18px",
        color: C.green,
        bold: true,
        alignment: "center",
      }),
      txt("استخدم جهاز العرض المسجل للدخول", 904, 550, 266, 26, {
        fontSize: "15px",
        color: C.lime2,
        alignment: "center",
      }),
    ],
    notes(
      "لا تبدأ بشرح كل القوائم. نفّذ السيناريو الخماسي كما هو. بعد ظهور الطلب في الإدارة، توقف لحظة وقل: هذه نفس البيانات التي دخلت من واجهة العميل. النسخة المرفوعة خاصة بالمالك حاليًا، لذلك استخدم جهازك المسجل للدخول في الاجتماع.",
      "اختبار المتصفح المحلي للواجهات الثلاث، ونسخة Sites المؤقتة الخاصة: https://napri-sales-phase-one-2026.logman-gelany.chatgpt.site — 21 أغسطس 2026",
    ),
  );

  composeSlide(
    presentation,
    [
      box(0, 0, W, H, C.green, { geometry: "rect" }),
      box(0, 0, 18, H, C.lime, { geometry: "rect" }),
      txt("القرار الذي نحتاجه اليوم", 74, 62, 620, 34, {
        fontSize: "17px",
        color: C.lime,
        bold: true,
      }),
      txt("نبدأ تشغيل نبري\nعلى نطاق صغير — الآن", 74, 144, 760, 142, {
        fontSize: "56px",
        color: C.white,
        bold: true,
      }),
      txt("نختبر الواقع، نجمع الملاحظات، ثم نوسّع بثقة.", 74, 316, 760, 50, {
        fontSize: "25px",
        color: C.lime2,
      }),
      box(74, 430, 344, 144, C.white),
      txt("01", 102, 452, 50, 28, { fontSize: "17px", color: C.gold, bold: true, alignment: "left" }),
      txt("اعتماد قائمة الأسعار", 102, 492, 286, 40, { fontSize: "24px", color: C.ink, bold: true }),
      txt("أو تحديد تعديلاتها النهائية", 102, 536, 286, 26, { fontSize: "16px", color: C.gray }),
      box(450, 430, 344, 144, C.lime),
      txt("02", 478, 452, 50, 28, { fontSize: "17px", color: C.green, bold: true, alignment: "left" }),
      txt("اختيار أول 20 عميلًا", 478, 492, 286, 40, { fontSize: "24px", color: C.green, bold: true }),
      txt("للتجربة التشغيلية الأولى", 478, 536, 286, 26, { fontSize: "16px", color: C.green2 }),
      box(826, 430, 344, 144, C.white),
      txt("03", 854, 452, 50, 28, { fontSize: "17px", color: C.gold, bold: true, alignment: "left" }),
      txt("تثبيت مسؤولية التشغيل", 854, 492, 286, 40, { fontSize: "24px", color: C.ink, bold: true }),
      txt("من يراجع الطلبات والتحصيل", 854, 536, 286, 26, { fontSize: "16px", color: C.gray }),
      txt("نبري · نبيع بوضوح، ونتوسع على بيانات", 74, 652, 1080, 32, {
        fontSize: "19px",
        color: C.lime,
        bold: true,
        alignment: "center",
      }),
    ],
    notes(
      "اختم بطلب ثلاثة قرارات محددة: اعتماد قائمة الأسعار، اختيار أول عشرين عميلًا، وتحديد من يراجع الطلبات والتحصيل يوميًا. لا تطلب اعتماد مرحلة ثانية الآن؛ النجاح المطلوب هو أسبوع تشغيل فعلي ثم مراجعة النتائج.",
    ),
  );

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await writeBlob(path.join(PREVIEW_DIR, `${stem}.png`), png);
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(PREVIEW_DIR, `${stem}.layout.json`), await layout.text());
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await writeBlob(path.join(PREVIEW_DIR, "deck-montage.webp"), montage);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(PPTX_PATH);
  console.log(JSON.stringify({ pptx: PPTX_PATH, preview: PREVIEW_DIR, slides: presentation.slides.items.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
