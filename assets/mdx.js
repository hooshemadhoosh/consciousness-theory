/* ============================================================
   مفسر MDX — assets/mdx.js
   یک برنامهٔ واحد که همهٔ یادداشت‌ها را از قالب .mdx می‌خواند و
   به HTML تبدیل می‌کند. قالب مادر (index.html) فقط همین مفسر را
   صدا می‌زند؛ دکمه‌ها، نوار پیشرفت، فهرست و همهٔ کامپوننت‌ها در
   قالب مادرند و این‌جا فقط «متن و محتوای» هر مقاله تفسیر می‌شود.

   قالب هر فایل .mdx:
     ---
     slug: note-3
     badge: یادداشت ۳
     title: عنوان مقاله
     lede: پاراگراف آغازین
     hero: ../image.webp
     heroAlt: متن جایگزین تصویر
     heroCaption: زیرنویس تصویر
     meta:
       - مورد فرادادهٔ یک
     ---
     متن مقاله با مارک‌داون + کامپوننت‌ها + HTML خام (برای SVG و جدول‌های پیچیده)

   فرمول ریاضی (LaTeX، با KaTeX که قالب مادر از CDN می‌خواند):
     $...$              فرمول درون‌خطی، در هر جای متن (پاراگراف، تیتر،
                        فهرست، جدول و درون کامپوننت‌ها)
     ```tex ... ```     بلوک فرمول نمایشی؛ چند خط با محیط aligned نوشته
                        می‌شود. بلوکِ تنها $$...$$ هم همین کار را می‌کند.
     اگر KaTeX لود نشده باشد یا فرمول خطا داشته باشد، به‌جای رندر خراب
     خودِ متن منبع لاتکس در جعبه‌ای خوانا (کلاس math-src) می‌نشیند تا
     فرمول در هیچ حالتی از دست نرود.

   کامپوننت‌های آماده (در قالب مادر تعریف شده‌اند):
     <CaseLab> ... ```json ... ``` ... </CaseLab>   آزمایشگاه داوری تعریف‌ها
     <Callout type="warn|key" title="...">متن</Callout>
     <DefBox label="...">متن</DefBox>
     <Mind title="...">متن</Mind>
     <Blind title="...">متن</Blind>
     <NoteBox title="...">متن</NoteBox>
     <Pull>متن</Pull>
     <Bio name="نام" role="نقش و سال‌ها" img="../bio/x.jpg" alt="...">متن زندگی‌نامه</Bio>
       حاشیهٔ مرجعِ زندگی‌نامهٔ صاحب‌نظر: یک کارت مستقل و جدا از ستون متن
       اصلی (به سبک حاشیهٔ کتاب‌های درسی) با برچسب «حاشیهٔ مرجع»، پرترهٔ
       فرد و دکمهٔ باز و بسته کردن؛ بدنه در آغاز بسته است. در همان فایل
       .mdx مقاله و کنار بخشِ خودِ آن فرد نوشته می‌شود.
     @@TOC@@   جای فهرست مقاله (قالب مادر آن را از تیترها می‌سازد)

   چارچوب ثابت هر مقاله (شش لایه؛ در صفحهٔ خانه نیز ثبت شده است):
     ۱) مسئلهٔ دقیق  ۲) تعریف و تمایزها  ۳) صاحب‌نظر در حاشیهٔ Bio
     ۴) استدلال و صحنهٔ ذهنی صاحب‌نظر  ۵) ایرادها و پاسخ‌ها با آدرس دقیق
     مقاله (پیوند + سال + مجله)  ۶) آزمون‌های مرزی (CaseLab)
   در ارجاع به مقاله‌های کلیدی، تصویر صفحهٔ نخست مقاله با نشانهٔ
   <figure class="papershot"> در متن می‌آید و به متن کامل پیوند می‌خورد
   (تصویرها در assets/papers).
   نام دانشمندان، شهرها و دانشگاه‌ها در نخستین کاربردشان در هر یادداشت
   با صورت انگلیسی در پرانتز می‌آید تا تلفظشان روشن باشد؛ مانند
   نیگل (Thomas Nagel)، بلگراد (Belgrade) و دانشگاه نیویورک
   (New York University). در متنِ تم note-2 با نشانهٔ
   <span class="ltr">(…)</span> و در تم‌های note-1 و پیوست با نشانهٔ
   <span class="en">(…)</span> نوشته می‌شود. متن مقاله‌ها خطاب به شخص خاصی نوشته
   نمی‌شود و از فعالیت شخصیِ هیچ‌کس سخن نمی‌گوید؛ لحن، لحن مقالهٔ
   منتشرشدنی است.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- مسیر نسبیِ داخل فایل mdx نسبت به پوشهٔ همان فایل حل می‌شود ---------- */
  function resolvePath(baseDir, rel) {
    if (!rel || rel.charAt(0) === '#' || rel.charAt(0) === '/' || /^[a-z][a-z0-9+.-]*:/i.test(rel)) return rel;
    var parts = (baseDir + rel).split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var s = parts[i];
      if (s === '..') out.pop();
      else if (s && s !== '.') out.push(s);
    }
    return out.join('/');
  }

  function resolveAttrs(html, baseDir) {
    return html.replace(/(src|href)="([^"]*)"/g, function (m, attr, v) {
      return attr + '="' + resolvePath(baseDir, v) + '"';
    });
  }

  /* ---------- فراداده (frontmatter) ---------- */
  function parseFrontmatter(text) {
    var meta = {};
    var body = text;
    var m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (m) {
      body = text.slice(m[0].length);
      var lines = m[1].split(/\r?\n/);
      var lastKey = null;
      lines.forEach(function (line) {
        var item = line.match(/^\s+-\s+(.*)$/);
        if (item && lastKey) {
          if (!Array.isArray(meta[lastKey])) meta[lastKey] = [];
          meta[lastKey].push(item[1].trim());
          return;
        }
        var kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (kv) {
          lastKey = kv[1];
          meta[lastKey] = kv[2].trim();
        }
      });
    }
    return { meta: meta, body: body };
  }

  /* ---------- فرمول ریاضی: LaTeX با KaTeX؛ بدون رندرر، منبع خوانا می‌ماند ---------- */
  function escTex(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function renderMath(tex, display) {
    tex = String(tex).replace(/^\s+|\s+$/g, '');
    if (typeof window !== 'undefined' && window.katex &&
        typeof window.katex.renderToString === 'function') {
      try {
        var html = window.katex.renderToString(tex, {
          displayMode: !!display, throwOnError: true, strict: false
        });
        return display
          ? '<div class="math math-display" dir="ltr">' + html + '</div>'
          : '<span class="math math-inline" dir="ltr">' + html + '</span>';
      } catch (e) { /* فرمول خراب: پایین، خودِ منبع لاتکس خوانا نشان داده می‌شود */ }
    }
    return display
      ? '<pre class="math-src" dir="ltr"><code>' + escTex(tex) + '</code></pre>'
      : '<code class="math-src" dir="ltr">' + escTex(tex) + '</code>';
  }

  /* ---------- مارک‌داون درون‌خطی؛ برچسب‌های HTML دست‌نخورده می‌مانند ---------- */
  function inline(text, baseDir) {
    var parts = text.split(/(<[^>]+>)/g);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].charAt(0) === '<') continue;
      var s = parts[i];
      /* فرمول درون‌خطی $...$ پیش از هر پردازش دیگری بیرون کشیده و رندر
         می‌شود و جایش نشانه می‌نشیند، تا نشانه‌های مارک‌داون (ستاره،
         براکت و مانند آن) داخل لاتکس دست نخورند؛ در پایان نشانه‌ها با
         خروجی رندرشده جایگزین می‌شوند. */
      var maths = [];
      s = s.replace(/\$([^$\n]+)\$/g, function (m, tex) {
        maths.push(renderMath(tex, false));
        return '@@MATH' + (maths.length - 1) + '@@';
      });
      s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
        return '<img src="' + resolvePath(baseDir, src) + '" alt="' + alt + '" />';
      });
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, href) {
        return '<a href="' + resolvePath(baseDir, href) + '">' + t + '</a>';
      });
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
      if (maths.length) {
        s = s.replace(/@@MATH(\d+)@@/g, function (m, idx) { return maths[+idx]; });
      }
      parts[i] = s;
    }
    return parts.join('');
  }

  var BLOCK_TAGS = /^(div|figure|table|article|section|blockquote|ul|ol|nav|footer|header|aside|svg|pre|form|fieldset)[\s>]/i;

  function tagBalance(html) {
    var m = html.match(/^<([a-zA-Z][\w-]*)/);
    if (!m) return 0;
    var tag = m[1].toLowerCase();
    var open = new RegExp('<' + tag + '(\\s|>)', 'gi');
    var close = new RegExp('</' + tag + '>', 'gi');
    var o = (html.match(open) || []).length;
    var c = (html.match(close) || []).length;
    if (/\/>$/.test(html.trim())) o -= 0;
    return o - c;
  }

  /* ---------- تبدیل بدنهٔ mdx به HTML ---------- */
  function renderBody(body, baseDir, stash) {
    /* کامپوننت CaseLab: دادهٔ JSON داخل حصار کد */
    body = body.replace(/<CaseLab>\s*```json\s*([\s\S]*?)```\s*<\/CaseLab>/g, function (m, json) {
      var idx = stash.labs.length;
      try { stash.labs.push(JSON.parse(json)); } catch (e) { stash.labs.push([]); }
      return '\n\n@@LAB' + idx + '@@\n\n';
    });

    /* کامپوننت‌های جعبه‌ای: محتوای درونشان دوباره با همین مفسر خوانده می‌شود */
    var compRe = /<(Callout|DefBox|Mind|Blind|NoteBox|Pull|Bio)((?:\s+[\w-]+="[^"]*")*)\s*>([\s\S]*?)<\/\1>/g;
    body = body.replace(compRe, function (m, tag, attrStr, inner) {
      var attrs = {};
      var am;
      var re = /([\w-]+)="([^"]*)"/g;
      while ((am = re.exec(attrStr))) attrs[am[1]] = am[2];
      var innerHtml = renderBody(inner.trim(), baseDir, stash);
      var html;
      if (tag === 'Callout') {
        html = '<div class="callout ' + (attrs.type || '') + '">' +
          (attrs.title ? '<span class="t">' + attrs.title + '</span> ' : '') + innerHtml + '</div>';
      } else if (tag === 'DefBox') {
        html = '<div class="defbox"><div class="deflabel">' + (attrs.label || 'صورت‌بندی دقیق تعریف') + '</div>' + innerHtml + '</div>';
      } else if (tag === 'Mind') {
        html = '<div class="mind">' + (attrs.title ? '<h4>' + attrs.title + '</h4>' : '') + innerHtml + '</div>';
      } else if (tag === 'Blind') {
        html = '<div class="blind"><h4><span>نقطهٔ کور ـ</span> ' + (attrs.title || '') + '</h4>' + innerHtml + '</div>';
      } else if (tag === 'NoteBox') {
        html = '<div class="note"><p class="t">' + (attrs.title || '') + '</p>' + innerHtml + '</div>';
      } else if (tag === 'Bio') {
        /* حاشیهٔ مرجعِ صاحب‌نظر: یک کارتِ مستقل و جدا از ستون متن اصلی است،
           به سبک حاشیه‌های کتاب‌های درسی و مرجع: برچسبِ «حاشیهٔ مرجع» در بالای
           کارت، پرترهٔ فرد، نام و نقش، و یک دکمهٔ واقعی برای باز و بسته کردن.
           بدنه در آغاز بسته (hidden) است و قالب مادر با شنوندهٔ کلیکِ سند آن
           را باز و بسته می‌کند؛ پس کارت هرگز با متن اصلی یکی نمی‌شود و
           عکس هم در سربرگ کارت و هم به‌صورت پرترهٔ بزرگ در بدنه می‌آید. */
        var src = attrs.img ? resolvePath(baseDir, attrs.img) : '';
        var alt = attrs.alt || attrs.name || '';
        var thumb = src
          ? '<img class="biocard-thumb" src="' + src + '" alt="' + alt + '" />'
          : '<span class="biocard-thumb biocard-thumb-empty" aria-hidden="true"></span>';
        var portrait = src
          ? '<figure class="biocard-portrait"><img src="' + src + '" alt="' + alt + '" loading="lazy" /><figcaption>' + (attrs.name || '') + '</figcaption></figure>'
          : '';
        html = '<aside class="biocard" aria-label="حاشیهٔ مرجع: ' + (attrs.name || '') + '">' +
          '<div class="biocard-bar"><span class="biocard-tab">حاشیهٔ مرجع ـ زندگی‌نامهٔ صاحب‌نظر</span></div>' +
          '<div class="biocard-head">' + thumb +
          '<span class="biocard-id"><span class="biocard-name">' + (attrs.name || '') + '</span>' +
          (attrs.role ? '<span class="biocard-role">' + attrs.role + '</span>' : '') +
          '<span class="biocard-note">این بخش جدا از متن اصلی است؛ زندگی، فضای ذهنی و سرگذشت این ادعا.</span></span>' +
          '<button type="button" class="biocard-toggle" aria-expanded="false">' +
          '<span class="biocard-toggle-label">خواندن زندگی‌نامه</span>' +
          '<span class="biocard-chev" aria-hidden="true">▾</span></button></div>' +
          '<div class="biocard-region" hidden><div class="biocard-body">' + portrait + innerHtml + '</div></div></aside>';
      } else { /* Pull */
        html = '<p class="pull">' + inline(inner.trim(), baseDir) + '</p>';
      }
      var idx = stash.comps.length;
      stash.comps.push(html);
      return '\n\n@@COMP' + idx + '@@\n\n';
    });

    /* تقسیم به بلوک‌ها: خط خالی مرز بلوک است؛ بلوک HTML چندخطی تا متوازن‌شدن برچسب ادامه می‌یابد */
    var rawBlocks = body.split(/\r?\n\s*\r?\n/);
    var blocks = [];
    var pending = null;
    rawBlocks.forEach(function (chunk) {
      chunk = chunk.replace(/^\s+|\s+$/g, '');
      if (!chunk && !pending) return;
      if (pending !== null) {
        pending += '\n' + chunk;
        if (tagBalance(pending) <= 0) { blocks.push(pending); pending = null; }
        return;
      }
      if (!chunk) return;
      if (chunk.charAt(0) === '<' && BLOCK_TAGS.test(chunk) && tagBalance(chunk) > 0) {
        pending = chunk; return;
      }
      blocks.push(chunk);
    });
    if (pending !== null) blocks.push(pending);

    var out = [];
    blocks.forEach(function (block) {
      out.push(renderBlock(block, baseDir, stash));
    });
    return out.join('\n');
  }

  function renderBlock(block, baseDir, stash) {
    var t = block.trim();
    var m;

    if ((m = t.match(/^@@LAB(\d+)@@$/))) {
      return '<div class="lab" data-lab="' + m[1] + '">' +
        '<h3>مورد را انتخاب کنید</h3>' +
        '<p class="hint">پس از انتخاب هر مورد، داوریِ خانواده‌های تعریف دربارهٔ همان مورد نمایش داده می‌شود.</p>' +
        '<div class="case-btns" role="group" aria-label="انتخاب مورد آزمایشی"></div>' +
        '<div class="case-desc"><p></p></div>' +
        '<div class="verdicts"></div></div>';
    }
    if ((m = t.match(/^@@COMP(\d+)@@$/))) return stash.comps[+m[1]];
    if (t === '@@TOC@@') return '@@TOC@@';

    /* تیتر */
    if ((m = t.match(/^(#{1,4})\s+([\s\S]*?)(?:\s*\{#([\w-]+)\})?\s*$/)) && t.indexOf('\n') === -1) {
      var level = m[1].length;
      var hid = m[3] ? ' id="' + m[3] + '"' : '';
      return '<h' + level + hid + '>' + inline(m[2], baseDir) + '</h' + level + '>';
    }

    /* خط جداکننده */
    if (/^(-{3,}|\*{3,})$/.test(t)) return '<hr />';

    /* بلوک فرمول نمایشیِ تنها: $$...$$ */
    if ((m = t.match(/^\$\$([\s\S]*?)\$\$$/))) {
      return renderMath(m[1], true);
    }

    /* حصار کد؛ حصار tex/math/latex بلوک فرمول نمایشی است */
    if ((m = t.match(/^```(\w*)\n([\s\S]*?)```$/))) {
      if (m[1] === 'tex' || m[1] === 'math' || m[1] === 'latex') {
        return renderMath(m[2], true);
      }
      return '<pre dir="ltr"><code>' + m[2].replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</code></pre>';
    }

    /* نقل‌قول */
    if (t.charAt(0) === '>') {
      var qlines = t.split(/\r?\n/).map(function (l) { return l.replace(/^>\s?/, ''); });
      return '<blockquote>' + qlines.map(function (l) {
        return '<p>' + inline(l, baseDir) + '</p>';
      }).join('') + '</blockquote>';
    }

    /* فهرست */
    var lines = t.split(/\r?\n/);
    if (lines.every(function (l) { return /^\s*-\s+/.test(l); })) {
      return '<ul>' + lines.map(function (l) {
        return '<li>' + inline(l.replace(/^\s*-\s+/, ''), baseDir) + '</li>';
      }).join('') + '</ul>';
    }
    if (lines.every(function (l) { return /^\s*\d+\.\s+/.test(l); })) {
      return '<ol>' + lines.map(function (l) {
        return '<li>' + inline(l.replace(/^\s*\d+\.\s+/, ''), baseDir) + '</li>';
      }).join('') + '</ol>';
    }

    /* جدول مارک‌داون */
    if (lines.length >= 2 && lines[0].charAt(0) === '|' && /^\|[\s:|-]+\|$/.test(lines[1].trim())) {
      var splitRow = function (l) {
        return l.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
      };
      var head = splitRow(lines[0]);
      var rows = lines.slice(2).filter(function (l) { return l.trim(); }).map(splitRow);
      var th = head.map(function (c) { return '<th scope="col">' + inline(c, baseDir) + '</th>'; }).join('');
      var trs = rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) {
          return i === 0
            ? '<th scope="row">' + inline(c, baseDir) + '</th>'
            : '<td data-l="' + head[i] + '">' + inline(c, baseDir) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      return '<table class="cmp"><thead><tr>' + th + '</tr></thead><tbody>' + trs + '</tbody></table>';
    }

    /* بلوک HTML خام (شکل‌ها، اینفوگرافی‌های SVG، کارت‌ها و جدول‌های پیچیده) */
    if (t.charAt(0) === '<') return resolveAttrs(t, baseDir);

    /* پاراگراف */
    return '<p>' + inline(t.replace(/\r?\n/g, ' '), baseDir) + '</p>';
  }

  /* ---------- API اصلی ---------- */
  function parse(text, mdxPath) {
    var baseDir = '';
    if (mdxPath) {
      var i = mdxPath.lastIndexOf('/');
      baseDir = i >= 0 ? mdxPath.slice(0, i + 1) : '';
    }
    var fm = parseFrontmatter(text);
    var stash = { labs: [], comps: [] };
    var html = renderBody(fm.body, baseDir, stash);
    return { meta: fm.meta, html: html, labs: stash.labs };
  }

  window.MDX = { parse: parse, resolvePath: resolvePath };
})();
