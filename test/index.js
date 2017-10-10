var assert = require('chai').assert,
    path = require('path'),
    Koa = require('koa'),
    http = require('http'),
    request = require('supertest'),
    VueView = require('../lib/index.js');

describe(`test koa-vue-view`, () => {
    describe('use', () => {
        it('base', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'rd'
            }));
            app.use(ctx => {
                assert.isTrue(typeof ctx.rd === 'function');
            })
            request(http.createServer(app.callback()))
                .get('/').end(function (err, res) {
                    done();
                });
        })
    })

    describe('render', () => {
        it('base', (done) => {
            var app = new Koa();
            app.use(VueView({
                methodName: 'render'
            }));
            app.use(ctx => {
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

        it('priority', (done) => {
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
            app.use(ctx => {
                ctx.state.user = 'State.user';
                ctx.state.age = 'State.age';
                ctx.render(path.resolve(__dirname, './views/priority.vue'), {
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
                    console.log(res.text.trim());
                    assert.isTrue('<div data-server-rendered="true"><span>Inline.user</span><span>State.age</span><span>Inline.add:3</span><div class="box2">2</div></div>' === res.text.trim());
                    done();
                });
        })

        // it('Global methods && data', (done) => {
        //     var app = new Koa();
        //     app.use(VueView({
        //         methodName: 'render',
        //         data: {
        //             user: 'Global.user',
        //             users: [
        //                 { name: 'Jeck', age: 20 },
        //                 { name: 'Alice', age: 22 }
        //             ]
        //         },
        //         methods: {
        //             add(a, b) {
        //                 return a + b;
        //             }
        //         }
        //     }));
        //     app.use(ctx => {
        //         ctx.state.user = 'Tom';
        //         ctx.render(path.resolve(__dirname, './views/base.vue'));
        //     })
        //     request(http.createServer(app.callback()))
        //         .get('/')
        //         .expect(200)
        //         .end(function (err, res) {
        //             if (err) return done(err);
        //             assert.isTrue('<span data-server-rendered="true">Tom</span>' === res.text.trim());
        //             done();
        //         });
        // })
    })
});