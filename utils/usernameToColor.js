// Part of Dreamchat — licensed under GPLv3. See LICENSE.

function usernameToColor(username) {
  if (!username) return 'hsl(0, 0%, 60%)';
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 65%)`;
}

module.exports = usernameToColor;
