import { api, toman } from '../api';

describe('toman', () => {
  it('formats numbers with Persian digits', () => {
    expect(toman(50000)).toBe('۵۰٬۰۰۰');
  });

  it('handles zero', () => {
    expect(toman(0)).toBe('۰');
  });
});

describe('api', () => {
  it('has teacher endpoint', () => {
    expect(typeof api.teacher).toBe('function');
  });

  it('has teachers endpoint', () => {
    expect(typeof api.teachers).toBe('function');
  });

  it('has bookSession endpoint', () => {
    expect(typeof api.bookSession).toBe('function');
  });

  it('has follow/unfollow endpoints', () => {
    expect(typeof api.follow).toBe('function');
    expect(typeof api.unfollow).toBe('function');
  });

  it('has becomeTeacher endpoint', () => {
    expect(typeof api.becomeTeacher).toBe('function');
  });
});
