# koa-vue-view
[![Build Status](https://travis-ci.org/imingyu/koa-vue-view.svg?branch=master)](https://travis-ci.org/imingyu/koa-vue-view)
![image](https://img.shields.io/npm/l/koa-vue-view.svg)
[![image](https://img.shields.io/npm/v/koa-vue-view.svg)](https://www.npmjs.com/package/koa-vue-view)
[![image](https://img.shields.io/npm/dt/koa-vue-view.svg)](https://www.npmjs.com/package/koa-vue-view)

A Koa view engine which renders Vue components on server.

> 1.x的分支/npm包支持koa1；master分支和2.x版本的npm包支持koa2。

# 需求
我熟悉书写vue的代码，感觉她的语法很简洁明了，并且支持组件化；我最近在学习使用koa编写node web应用，在koa框架中渲染视图有很多选择；但是我想在koa中使用vue来渲染视图；

我在调研了vue的ssr解决方案后，感觉她很好，但是不满足我的需求，我只是想用她的语法和组件化来实现视图渲染，渲染的数据想从koa的`ctx.state`中读取，也不想前后端同用同一套路由这种方式；

所以我觉得用vue的ssr的基础部分——服务端渲染vue实例，来完成我的需求，即此中间件诞生；

## 本中间件包含功能：
- 服务端渲染vue语法的视图文件
- 视图文件的语法采用vue组件的编写语法
- 支持vue的组件化
- 支持全局数据、组件等共享

> 注意：本中间件虽然支持vue组件的编写语法，但是仅会处理其中的`template`部分，其他的如`style`，`script`等部分都会原样输出

## 待添加功能：
- 不应编译视图文件中template标签中的前端用的vue代码

# 安装
```bash
npm i -S koa-vue-view
```

# 使用
```html
<!--模板： ./views/Master.vue -->
<template>
    <html lang="zh-CN">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>{{hight(app.name)}} - {{app.version}}</title>
        <slot name="meta"></slot>
    </head>

    <body>
        <h1>{{layoutName}} - {{layoutVersion}}</h1>
        <slot name="top"></slot>
        <slot></slot>
        <slot name="bottom"></slot>
    </body>

    </html>
</template>

<!--组件： ./components/Age.vue -->
<template>
    <strong style="color:red;">
        <slot></slot>
    </strong>
</template>


<!--页面： ./views/User.vue -->
<template>
    <Master>
        <ul>
            <li v-for="(item,index) in users" :key="index">{{item.name}} <Age>{{ add(item.age, 1) }}</Age></li>
        </ul>
    </Master>
</template>
```

```javascript
var path = require('path');
var Koa = require('koa');
var VueView = require('koa-vue-view');

var app = new Koa();
app.use(VueView({
    methodName: 'render',//在koa ctx注册渲染视图的方法名，默认render
    data: {
        _: require('lodash'),
        app: {
            name: 'Github',
            version: '1.0.0'
        }
    },
    methods: {
        add(a, b) {
            return a + b;
        }
    },
    components: {
        Master: {
            path: path.resolve(__dirname, './views/Master.vue'),
            data() {
                this.layoutVersion = '1.0.0';
                return {
                    layoutName: 'master'
                }
            },
            methods: {
                hight(str) {
                    return `***${str}***`;
                }
            }
        },
        Age: path.resolve(__dirname, './components/Age.vue')
    }
}));

app.use(ctx => {
    ctx.state.users = [{
        name: 'Tom',
        age: 20
    }, {
        name: 'Alice',
        age: 18
    }];
    ctx.render(path.resolve(__dirname, './views/User.vue'));
    /*
    或者
    ctx.render({
        path:path.resolve(__dirname, './views/User.vue'),
        data(){
            return {name:'Github'}
        },
        methods:{
            show(){}
        }
    });
    */
})


app.listen(8200);
```

# 规约
- 在读取视图文件内容时，会将其内容分割为三部分：`header`、`template`、`footer`；
    - `template`截取自文件中第一对顶级`template`标签中的内容；
    - `header`截取自文件中第一对顶级`template`标签的前面内容；
    - `footer`截取自文件中第一对顶级`template`标签的后面内容；
    - **视图文件中仅允许包含一对顶级`template`标签**
- **渲染视图时仅渲染`template`部分**

# Options
```javascript
app.use(require('koa-vue-view')(options));
```
可接受的options选项：
<table>
    <thead>
        <tr>
            <td>选项</td>
            <td>类型</td>
            <td>默认值</td>
            <td>描述</td>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>methodName</td>
            <td>string</td>
            <td>render</td>
            <td>在koa ctx注册渲染视图的方法名，默认render</td>
        </tr>
        <tr>
            <td>replaceBody</td>
            <td>boolean</td>
            <td>true</td>
            <td>是否使用渲染后的字符串替换ctx.body的内容</td>
        </tr>
        <tr>
            <td>appendBody</td>
            <td>boolean</td>
            <td>false</td>
            <td>replaceBody=true时，将渲染后的字符串追加到ctx.body中还是直接赋值给ctx.body</td>
        </tr>
        <tr>
            <td>filterHtml</td>
            <td>function</td>
            <td></td>
            <td>可指定一个函数用于过滤render之后的html字符串，ctx.body=函数返回值=过滤后的字符串</td>
        </tr>
        <tr>
            <td>cache</td>
            <td>boolean</td>
            <td>process.env.NODE_ENV === 'production'</td>
            <td>是否启用缓存，启用后仅在第一次加载视图时读取其内容，后续将从缓存中读取</td>
        </tr>
        <tr>
            <td>renderer</td>
            <td>object</td>
            <td>require('vue-server-renderer').createRenderer()</td>
            <td>vue ssr 渲染器</td>
        </tr>
        <tr>
            <td>data</td>
            <td>object|function</td>
            <td></td>
            <td>全局共享数据对象，在所以组件和页面中都可以共享使用，如果传递的是function，则执行function的this对象指向运行的组件或者页面的vue实例</td>
        </tr>
        <tr>
            <td>vue mixin可接受的任意选项，如：data，methods，components</td>
            <td></td>
            <td></td>
            <td>
            将以mixin的方式，添加到每个渲染的页面的mixins中；
            </td>
        </tr>
    </tbody>
</table>

# Render
```javascript
app.use(ctx => {
    ctx.render(文件路径|组件配置对象).then(html=>{})
})
```

# 更新日志
> 1.x对应的是koa1适用的版本，2.x对应的是koa2对应的版本；

## 2.1.6  |  1.1.6
- 解决全局组件中引用全局组件时渲染出错的问题；
- 加入`filterHtml`配置项，用于过滤渲染后的html字符串

## 2.1.5
- fix issues[#1](https://github.com/imingyu/koa-vue-view/issues/1)

## 1.1.2
- fix issues[#1](https://github.com/imingyu/koa-vue-view/issues/1)

## 2.1.3
- 核心功能实现

## 1.1.1
- 核心功能实现
