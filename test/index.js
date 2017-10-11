var assert = require('chai').assert,
    path = require('path'),
    Koa = require('koa'),
    Router = require('koa-router'),
    http = require('http'),
    request = require('supertest'),
    VueView = require('../lib/index.js');

describe(`test koa-vue-view`, () => {
    describe('app.use', () => {
        it('基础', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'rd'
            }));
            app.use(function* (next) {
                var ctx = this;
                assert.isTrue(typeof ctx.rd === 'function');
            })
            request(http.createServer(app.callback()))
                .get('/').end(function (err, res) {
                    done();
                });
        })
        it('传入回调函数', (done) => {
            var app = new Koa();
            app.use(VueView(Vue => {
                return {
                    sd: 1,
                    methodName: 'render',
                    components: {
                        Iv: path.resolve(__dirname, './components/iv.vue')
                    }
                }
            }));
            app.use(function* (next) {
                var ctx = this;
                assert.isTrue(typeof ctx.render === 'function');
                ctx.render(path.resolve(__dirname, './views/inputVueCallback.vue'));
            })
            request(http.createServer(app.callback()))
                .get('/').end(function (err, res) {
                    if (err) return done(err);
                    assert.isTrue('<span data-server-rendered="true" class="iv">Hi</span>' === res.text.trim());
                    done();
                });
        })
    })

    describe('渲染测试', () => {
        it('基础', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'render'
            }));
            app.use(function* (next) {
                var ctx = this;
                ctx.state.user = 'Tom';
                ctx.render(path.resolve(__dirname, './views/base.vue'));
            })
            request(http.createServer(app.callback()))
                .get('/')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.isTrue('<span data-server-rendered="true">Tom</span>' === res.text.trim());
                    done();
                });
        })

        it('静态头部尾部渲染', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'render'
            }));
            app.use(function* (next) {
                var ctx = this;
                ctx.state.msg = 'Hi';
                ctx.render(path.resolve(__dirname, './views/top-bottom.vue'));
            })
            request(http.createServer(app.callback()))
                .get('/')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.isTrue('abc<div data-server-rendered="true">123Hi</div>456' === res.text.trim());
                    done();
                });
        })

        it('优先级渲染', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'render',
                data: {
                    user: 'Global.user',
                    age: 'Global.age',
                },
                methods: {
                    add(a, b) {
                        return 'Global.add:' + (a + b);
                    }
                },
                components: {
                    Box: path.resolve(__dirname, './components/box1.vue')
                }
            }));
            app.use(function* (next) {
                var ctx = this;
                ctx.state.user = 'State.user';
                ctx.state.age = 'State.age';
                ctx.render({
                    path: path.resolve(__dirname, './views/priority.vue'),
                    data: {
                        user: 'Inline.user'
                    },
                    methods: {
                        add(a, b) {
                            return 'Inline.add:' + (a + b);
                        }
                    },
                    components: {
                        Box: path.resolve(__dirname, './components/box2.vue')
                    }
                });
            })
            request(http.createServer(app.callback()))
                .get('/')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.isTrue('abc<div data-server-rendered="true"><span>Inline.user</span><span>State.age</span><span>Inline.add:3</span><div class="box2">2</div></div>' === res.text.trim());
                    done();
                });
        })

        it('路由渲染1', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'render'
            }));

            var router = new Router();
            app.use(router.routes());
            app.use(router.allowedMethods());

            router.get('/abc', function* (next) {
                var ctx = this;
                ctx.state.users = ['Tom', 'Alice'];
                ctx.render(path.resolve(__dirname, './views/abc.vue'));
            })

            app.use(function* (next) {
                var ctx = this;
                ctx.state.msg = 'Hi';
                ctx.render(path.resolve(__dirname, './views/top-bottom.vue'));
            })
            request(http.createServer(app.callback()))
                .get('/')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.isTrue('abc<div data-server-rendered="true">123Hi</div>456' === res.text.trim());
                    done();
                });
        })

        it('路由渲染2', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'render'
            }));

            var router = new Router();
            router.get('/abc', function* (next) {
                var ctx = this;
                ctx.state.user = 'Tom';
                ctx.render(path.resolve(__dirname, './views/abc.vue'));
            })

            app.use(router.routes());
            app.use(router.allowedMethods());

            app.use(function* (next) {
                var ctx = this;
                ctx.state.msg = 'Hi';
                ctx.render(path.resolve(__dirname, './views/top-bottom.vue'));
            })
            request(http.createServer(app.callback()))
                .get('/abc')
                .expect(200)
                .end(function (err, res) {
                    if (err) return done(err);
                    assert.isTrue('<div data-server-rendered="true">Tom</div>' === res.text.trim());
                    done();
                });
        })
    })
});