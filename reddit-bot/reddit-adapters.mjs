// All identities come from the trusted request context and independent Reddit reads.
export function createRedditAdapters({ reddit, getContext }) {
  const allowed = () => {
    const context = getContext();
    return context.appSlug === 'saudilaw-jobs' && typeof context.subredditName === 'string' &&
      ['saudilaw', 'saudilaw_jobs_dev'].includes(context.subredditName.toLowerCase());
  };
  async function getAppAuthorId() {
    const app = await reddit.getAppUser();
    if (!/^t2_[a-z0-9]+$/.test(app?.id ?? '') || app.username !== 'saudilaw-jobs') throw new Error('App author unavailable or unexpected');
    return app.id;
  }
  async function authorizeModerator() {
    const context = getContext();
    if (!allowed() || !context.userId) return false;
    const me = await reddit.getCurrentUser();
    if (!me || me.id !== context.userId) return false;
    const mods = await reddit.getModerators({ subredditName: context.subredditName, username: me.username, limit: 1 }).get(1);
    const permissions = mods.find(mod => mod.id === context.userId)?.moderatorInfo?.modPermissions ?? [];
    return permissions.includes('all') || permissions.includes('posts');
  }
  async function fetchPost(postId) {
    const post = await reddit.getPostById(postId);
    return { id: post.id, subredditName: post.subredditName, authorId: post.authorId, text: post.body ?? '',
      deleted: post.body === '[deleted]' || post.removedByCategory === 'deleted', removed: post.removed };
  }
  async function submitVerified(post) {
    const context = getContext();
    if (!allowed() || post.runAs !== 'APP' || post.subredditName.toLowerCase() !== context.subredditName.toLowerCase()) throw new Error('Submission target mismatch');
    const authorId = await getAppAuthorId();
    const created = await reddit.submitPost({ ...post, runAs: 'APP', sendreplies: false });
    if (!/^t3_[a-z0-9]+$/.test(created?.id ?? '')) throw new Error('Unknown post receipt');
    // A hydration/readback error can occur after creation: never retry this call here.
    const observed = await reddit.getPostById(created.id);
    if (observed.id !== created.id || observed.authorId !== authorId || observed.subredditName.toLowerCase() !== post.subredditName.toLowerCase() ||
        observed.title !== post.title || observed.body?.replace(/\r\n/g, '\n') !== post.text.replace(/\r\n/g, '\n')) throw new Error('Post readback mismatch');
    return { id: observed.id };
  }
  async function deleteOwnedPost(postId) {
    if (!allowed() || !/^t3_[a-z0-9]+$/.test(postId ?? '')) throw new Error('Wrong community or post ID');
    const post = await reddit.getPostById(postId);
    if (post.id !== postId || post.authorId !== await getAppAuthorId() || post.subredditName.toLowerCase() !== getContext().subredditName.toLowerCase() ||
        !/^SaudiLaw Jobs attempt: SLJ2-[a-f0-9]{32}$/m.test(post.body ?? '')) throw new Error('Not a verified bot post');
    await post.delete();
  }
  return { allowed, authorizeModerator, getAppAuthorId, fetchPost, submitVerified, deleteOwnedPost };
}
