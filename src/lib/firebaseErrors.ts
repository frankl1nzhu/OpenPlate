export function getFirebaseErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/email-already-in-use': return '该邮箱已被注册';
      case 'auth/wrong-password': return '密码错误';
      case 'auth/user-not-found': return '未找到该邮箱对应的账号';
      case 'auth/invalid-email': return '邮箱格式不正确';
      case 'auth/too-many-requests': return '操作过于频繁，请稍后再试';
      case 'auth/weak-password': return '密码强度不够，至少需要6位';
      case 'auth/network-request-failed': return '网络连接失败，请检查网络后重试';
      case 'auth/invalid-credential': return '邮箱或密码不正确';
      case 'auth/user-disabled': return '该账号已被禁用';
      default: return '操作失败，请重试';
    }
  }
  return '操作失败，请重试';
}
