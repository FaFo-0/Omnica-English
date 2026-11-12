// Operator-only marketing demo fixture on the development deployment: one
// fictional speaking lesson (transcript with speaker labels) waiting for the
// teacher's review, so the real AI steps (summary, vocabulary, mistakes) can be
// run and screen-recorded. Not a public function; fails closed off dev.
import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { ACADEMY_ID, tenantTable } from './lib/tenant';
import { assertQaBackendEnvironment } from './lib/qaSafety';

const DIALOGUE: Array<[string, string]> = [
  ['Teacher', 'Hi Anna! How was your weekend? Did you do anything fun?'],
  ['Student', 'Hi! Yes, it was very nice. On Saturday I go to the mountains with my friends.'],
  ['Teacher', 'Oh, lovely. Which mountains did you go to?'],
  ['Student', 'We went to Big Almaty Lake. It is very beautiful place, the water is so blue.'],
  ['Teacher', 'I have heard about it. How did you get there?'],
  ['Student', 'We took a taxi to the start and after we walked maybe three hours. It was very tiring but worth it.'],
  ['Teacher', 'Worth it — great phrase. Say it again: it was worth it.'],
  ['Student', 'It was worth it.'],
  ['Teacher', 'Perfect. And what did you do at the lake?'],
  ['Student', 'We made a lot of photos and we had a picnic. My friend brought sandwiches and hot tea.'],
  ['Teacher', 'Nice. In English we say take photos, not make photos. So: we took a lot of photos.'],
  ['Student', 'We took a lot of photos. Okay, I understand.'],
  ['Teacher', 'Was it crowded? Were there many people?'],
  ['Student', 'Yes, people was everywhere, because the weather was sunny. But we found a quiet place near the water.'],
  ['Teacher', 'Some people say it is better to go early in the morning. What do you think?'],
  ['Student', 'I am agree with this. Next time we will go at six o\'clock, before everybody.'],
  ['Teacher', 'Good plan. Do you often go hiking?'],
  ['Student', 'Not so often. I am working a lot, so I have free time only on weekends. But I want to go more.'],
  ['Teacher', 'What stops you? Is it the time or something else?'],
  ['Student', 'Mostly time. And sometimes I am lazy, honestly. It depends from the weather also.'],
  ['Teacher', 'That is very honest! The weather can change quickly in the mountains.'],
  ['Student', 'Yes, last year we had a bad situation. It started to rain very strong and we didn\'t had umbrellas.'],
  ['Teacher', 'Oh no. What did you do?'],
  ['Student', 'We were waiting under a big tree almost one hour. After that I always check the forecast before.'],
  ['Teacher', 'Forecast — that is the right word. A weather forecast. Let us write that down.'],
  ['Student', 'Weather forecast. Okay. Can I ask, what is the difference between trip and travel?'],
  ['Teacher', 'Good question. Trip is a noun: we went on a trip. Travel is usually a verb: I love to travel.'],
  ['Student', 'So I can say: last weekend I went on a trip to the mountains.'],
  ['Teacher', 'Exactly right. Where would you like to travel next?'],
  ['Student', 'I dream to visit Georgia. My colleague was there and she said the food is amazing and people are very friendly.'],
  ['Teacher', 'We say dream of visiting. I dream of visiting Georgia.'],
  ['Student', 'I dream of visiting Georgia. Maybe in spring, when it is not so hot.'],
  ['Teacher', 'Great. For homework, write five sentences about your trip using the past simple.'],
  ['Student', 'Okay, I will do it. Thank you, it was a very interesting lesson for me.'],
];

export const seedSpeakingLesson = internalMutation({
  args: { teacherId: v.string(), studentId: v.string() },
  handler: async (ctx, { teacherId, studentId }) => {
    assertQaBackendEnvironment(process.env.CONVEX_CLOUD_URL, process.env.CLERK_JWT_ISSUER_DOMAIN);
    const now = new Date().toISOString();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 86400000));
    const externalId = 'qa:demo:speaking-weekend';
    const events = tenantTable(ctx, ACADEMY_ID, 'scheduleEvents');
    const lessons = tenantTable(ctx, ACADEMY_ID, 'lessons');
    let lesson = await lessons.query().withIndex('by_organization_and_externalId', q => q.eq('organizationId', ACADEMY_ID).eq('externalId', externalId)).unique();
    const transcript = DIALOGUE.map(([s, t]) => `${s}: ${t}`).join('\n');
    const reset = { status: 'review' as const, transcript, summary: '', transcriptVersion: 1, title: 'Weekend in the mountains', titleSource: 'teacher' as const,
      contentStatus: { summary: 'pending' as const, vocabulary: 'pending' as const, flashcards: 'pending' as const, quiz: 'pending' as const },
      teacherNotes: 'Speaking lesson: weekend trip. Targets: past simple, take photos, worth it, weather forecast, trip vs travel, dream of + -ing.' };
    if (lesson) {
      await lessons.patch(lesson._id, { ...reset, publishedAt: undefined });
    } else {
      const eventId = await events.insert({ externalId, teacherId, studentId, type: '1on1', title: 'Speaking lesson', date, startTime: '18:00', endTime: '19:00', status: 'completed', createdAt: now });
      const id = await lessons.insert({ externalId, teacherId, studentId, ...reset, durationSeconds: 25 * 60, order: 0, scheduleEventId: eventId, recordingMode: 'live', createdAt: now });
      lesson = await lessons.get(id);
    }
    const lessonId = lesson!._id;
    // Clear anything an earlier run (or a recorded review) produced.
    for (const table of ['lessonTranscriptUtterances', 'lessonMistakes', 'lessonVocabulary', 'lessonFlashcards', 'lessonQuizQuestions'] as const) {
      const rows = await ctx.db.query(table).withIndex('by_lessonId', q => q.eq('lessonId', lessonId)).collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    let t = 4000;
    for (const [i, [speaker, text]] of DIALOGUE.entries()) {
      const dur = 900 + text.length * 65;
      await ctx.db.insert('lessonTranscriptUtterances', { organizationId: ACADEMY_ID, lessonId, utteranceId: `u${i}`, transcriptVersion: 1, text, speaker, startMs: t, endMs: t + dur, createdAt: now });
      t += dur + 18000 + (i % 3) * 7000;
    }
    return { lessonId, utterances: DIALOGUE.length };
  },
});

/** Rename the fictional QA actors (and set their UI language) for a recording, and back afterwards (dev only). */
export const setActorNames = internalMutation({
  args: { names: v.array(v.object({ externalId: v.string(), name: v.string(), locale: v.optional(v.union(v.literal('en'), v.literal('ru'), v.literal('kk'))) })) },
  handler: async (ctx, { names }) => {
    assertQaBackendEnvironment(process.env.CONVEX_CLOUD_URL, process.env.CLERK_JWT_ISSUER_DOMAIN);
    const users = tenantTable(ctx, ACADEMY_ID, 'users');
    for (const { externalId, name, locale } of names) {
      const user = await users.query().withIndex('by_organization_and_externalId', q => q.eq('organizationId', ACADEMY_ID).eq('externalId', externalId)).unique();
      if (!user || !/^qa-.*\+omnica@example\.com$/.test(user.email)) throw new Error('Only QA actors can be renamed');
      await users.patch(user._id, { name, nameSetInApp: true, ...(locale ? { locale } : {}) });
    }
    return null;
  },
});
