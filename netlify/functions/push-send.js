const webpush = require('web-push');
const { getStore } = require('@netlify/blobs');

webpush.setVapidDetails(
  'mailto:danieljahearn@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const CONDITIONS = ['Safety', 'Attunement', 'Soothing', 'Expressed Delight', 'Exploration'];
const MESSAGES = {
  Safety:             { title: 'Today: Safety',              body: 'What does your teen need most right now to feel safe with you?' },
  Attunement:         { title: 'Today: Attunement',          body: 'What part of your teen\'s inner world do you most want to understand today?' },
  Soothing:           { title: 'Today: Soothing',            body: 'Where in your body do you feel most settled right now? Can you bring that into contact with your teen?' },
  'Expressed Delight':{ title: 'Today: Expressed Delight',   body: 'When did you last let your teen see that their existence delights you?' },
  Exploration:        { title: 'Today: Exploration',         body: 'Where is your teen pushing outward right now? Can you hold steady and stay available?' }
};

exports.handler = async () => {
  const dayIndex = Math.floor(Date.now() / 86400000) % CONDITIONS.length;
  const condition = CONDITIONS[dayIndex];
  const payload = JSON.stringify(MESSAGES[condition]);

  try {
    const store = getStore({ name: 'push-subscriptions', consistency: 'strong' });
    const { blobs } = await store.list();
    if (!blobs.length) return { statusCode: 200, body: 'No subscribers' };

    let sent = 0, removed = 0;
    await Promise.allSettled(
      blobs.map(async ({ key }) => {
        try {
          const raw = await store.get(key);
          if (!raw) return;
          const { subscription } = JSON.parse(raw);
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch(e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await store.delete(key).catch(() => {});
            removed++;
          } else {
            console.warn('Send failed:', key, e.message);
          }
        }
      })
    );

    console.log(`Push sent: ${sent}, removed stale: ${removed}`);
    return { statusCode: 200, body: JSON.stringify({ sent, removed }) };
  } catch(e) {
    console.error('push-send error:', e);
    return { statusCode: 500, body: 'Error' };
  }
};
