import React, { useMemo, useState } from 'react';
import type { Course, CourseQuizQuestion, EvidenceDocument, Lesson } from '../../types';
import { isDirectMediaVideoUrl, isPdfDataUrl, isPdfHttpUrl, youtubeWatchToEmbed } from '../../utils/courseMedia';

function pickPrimaryAttachment(attachments?: EvidenceDocument[]): EvidenceDocument | null {
  if (!attachments?.length) return null;
  const pdf = attachments.find((a) => isPdfDataUrl(a.dataUrl) || /\.pdf$/i.test(a.fileName));
  return pdf || attachments[0];
}

export function LessonInPlatformViewer({
  lesson,
  course,
  isFr = true,
}: {
  lesson: Lesson;
  course: Course;
  isFr?: boolean;
}) {
  const primaryUrl = lesson.contentUrl?.trim() || course.youtubeUrl?.trim() || '';
  const embedYoutube = useMemo(() => (primaryUrl ? youtubeWatchToEmbed(primaryUrl) : null), [primaryUrl]);
  const attachment = useMemo(() => pickPrimaryAttachment(lesson.attachments), [lesson.attachments]);

  if (!primaryUrl && !attachment) {
    return (
      <div className="rounded-coya border border-dashed border-coya-border bg-coya-bg/40 p-6 text-center text-sm text-coya-text-muted">
        {isFr
          ? 'Aucune vidéo ou document principal. Ajoutez une URL ou une pièce jointe (PDF) dans la gestion du cours.'
          : 'No main video or document. Add a URL or a PDF attachment in course management.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {embedYoutube && (
        <div className="relative w-full overflow-hidden rounded-coya border border-coya-border bg-black aspect-video shadow-md">
          <iframe
            title={lesson.title}
            src={`${embedYoutube}?rel=0`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {!embedYoutube && primaryUrl && isDirectMediaVideoUrl(primaryUrl) && (
        <div className="rounded-coya border border-coya-border bg-black overflow-hidden shadow-md">
          <video src={primaryUrl} controls className="w-full max-h-[70vh]" playsInline>
            {isFr ? 'Votre navigateur ne lit pas la vidéo.' : 'Your browser cannot play this video.'}
          </video>
        </div>
      )}
      {!embedYoutube && primaryUrl && !isDirectMediaVideoUrl(primaryUrl) && (isPdfHttpUrl(primaryUrl) || primaryUrl.startsWith('data:application/pdf')) && (
        <div className="relative w-full overflow-hidden rounded-coya border border-coya-border bg-coya-card aspect-[4/3] min-h-[360px] shadow-md">
          <iframe title={lesson.title} src={primaryUrl} className="absolute inset-0 h-full w-full" />
        </div>
      )}
      {attachment && (isPdfDataUrl(attachment.dataUrl) || /\.pdf$/i.test(attachment.fileName)) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-coya-text-muted uppercase tracking-wide">
            {isFr ? 'Document (dans la plateforme)' : 'Document (in-platform)'}
          </p>
          <div className="relative w-full overflow-hidden rounded-coya border border-coya-border bg-coya-card aspect-[4/3] min-h-[360px] shadow-inner">
            <iframe title={attachment.fileName} src={attachment.dataUrl} className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      )}
      {!embedYoutube && primaryUrl && !isDirectMediaVideoUrl(primaryUrl) && !isPdfHttpUrl(primaryUrl) && !primaryUrl.startsWith('data:application/pdf') && (
        <div className="rounded-coya border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium mb-1">{isFr ? 'Lecture intégrée limitée' : 'Limited inline viewing'}</p>
          <p className="text-xs mb-2">
            {isFr
              ? 'Ce lien n’est pas une vidéo directe, YouTube ou PDF. Ouvrez-le en complément ou remplacez-le par une URL embeddable.'
              : 'This link is not a direct video, YouTube, or PDF. Open it separately or use an embeddable URL.'}
          </p>
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-coya-primary underline"
          >
            {isFr ? 'Ouvrir dans un nouvel onglet' : 'Open in new tab'}
          </a>
        </div>
      )}
    </div>
  );
}

export function LessonQuizRunner({
  questions,
  isFr,
  onPassed,
}: {
  questions: CourseQuizQuestion[];
  isFr: boolean;
  onPassed?: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [allOk, setAllOk] = useState(false);

  if (!questions.length) {
    return (
      <p className="text-sm text-coya-text-muted">
        {isFr ? 'Aucune question configurée pour ce quiz.' : 'No questions configured for this quiz.'}
      </p>
    );
  }

  const toggle = (qid: string, choiceId: string, mode: 'single' | 'multiple') => {
    if (submitted) return;
    setSelections((prev) => {
      const next = { ...prev };
      if (mode === 'single') {
        next[qid] = new Set([choiceId]);
      } else {
        const s = new Set(next[qid] || []);
        if (s.has(choiceId)) s.delete(choiceId);
        else s.add(choiceId);
        next[qid] = s;
      }
      return next;
    });
  };

  const check = () => {
    let ok = true;
    for (const q of questions) {
      const sel = selections[q.id] || new Set();
      const correct = new Set(q.correctChoiceIds);
      if (sel.size !== correct.size) {
        ok = false;
        break;
      }
      for (const id of correct) {
        if (!sel.has(id)) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }
    setSubmitted(true);
    setAllOk(ok);
    if (ok) onPassed?.();
  };

  const reset = () => {
    setSelections({});
    setSubmitted(false);
    setAllOk(false);
  };

  return (
    <div className="rounded-coya border border-coya-border bg-coya-card p-4 space-y-5">
      <h4 className="font-semibold text-coya-text flex items-center gap-2">
        <i className="fas fa-question-circle text-coya-primary" />
        {isFr ? 'Quiz' : 'Quiz'}
      </h4>
      {questions.map((q, idx) => (
        <div key={q.id} className="border-t border-coya-border pt-4 first:border-t-0 first:pt-0">
          <p className="text-sm font-medium text-coya-text mb-2">
            {idx + 1}. {q.prompt}
            <span className="text-coya-text-muted font-normal text-xs ml-2">
              ({q.mode === 'single' ? (isFr ? 'une réponse' : 'single answer') : isFr ? 'plusieurs réponses' : 'multiple answers'})
            </span>
          </p>
          <ul className="space-y-2">
            {q.choices.map((c) => {
              const checked = (selections[q.id] || new Set()).has(c.id);
              let showWrong = false;
              let showRight = false;
              if (submitted) {
                const isCorrect = q.correctChoiceIds.includes(c.id);
                showRight = isCorrect;
                showWrong = checked && !isCorrect;
              }
              return (
                <li key={c.id}>
                  <label
                    className={`flex items-start gap-2 rounded-coya border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      showRight ? 'border-emerald-400 bg-emerald-50' : showWrong ? 'border-red-300 bg-red-50' : 'border-coya-border bg-coya-bg/50 hover:bg-coya-bg'
                    }`}
                  >
                    <input
                      type={q.mode === 'single' ? 'radio' : 'checkbox'}
                      name={`quiz-${q.id}`}
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggle(q.id, c.id, q.mode)}
                      disabled={submitted}
                    />
                    <span className="text-coya-text">{c.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-2">
        {!submitted ? (
          <button
            type="button"
            onClick={check}
            className="rounded-coya bg-coya-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            {isFr ? 'Valider mes réponses' : 'Submit answers'}
          </button>
        ) : (
          <>
            <p
              className={`text-sm font-medium w-full ${allOk ? 'text-emerald-700' : 'text-red-700'}`}
              role="status"
            >
              {allOk
                ? isFr
                  ? 'Bravo : toutes les réponses sont correctes. Vous pouvez marquer la leçon comme terminée.'
                  : 'All answers correct. You can mark the lesson complete.'
                : isFr
                  ? 'Certaines réponses sont incorrectes. Réessayez après réinitialisation.'
                  : 'Some answers are wrong. Reset and try again.'}
            </p>
            <button type="button" onClick={reset} className="rounded-coya border border-coya-border px-4 py-2 text-sm text-coya-text">
              {isFr ? 'Réessayer' : 'Try again'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
