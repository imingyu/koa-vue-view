var util = require('./util.js');

var parseSpec = fileName => {
    var file = {};
    if (typeof fileName === 'object' && fileName.path) {
        Object.assign(file, fileName);
    } else {
        file.path = fileName + '';
    }
    file.template = util.readFile(file.path);
    file.template = file.template;
    file.header = file.header || '';
    file.footer = file.footer || '';
    return file;
}

module.exports = function (fileName) {
    var spec = parseSpec(fileName),
        template = spec.template,
        begin = '<template>',
        end = '</template>';
    spec.orgTemplate = template;
    template = (template + '').trim();
    if (template.startsWith(begin) && template.endsWith(end)) {
        template = template.substring(begin.length, template.lastIndexOf(end));
    } else if (template.startsWith(begin)) {
        spec.footer += template.substring(template.lastIndexOf(end) + end.length);
        template = template.substring(begin.length, template.lastIndexOf(end));
    } else if (template.endsWith(end)) {
        spec.header += template.substring(0, template.indexOf(begin));
        template = template.substring(template.indexOf(begin) + begin.length, template.lastIndexOf(end));
    } else {
        //截取header：<template>之前的字符串
        spec.header += template.substring(0, template.indexOf(begin));
        //删除header + <template>
        template = template.substring(template.indexOf(begin) + begin.length);
        //截取footer：</template>之后的字符串
        spec.footer += template.substring(template.lastIndexOf(end) + end.length);
        //删除footer + </template>
        template = template.substring(0, template.lastIndexOf(end));
    }
    spec.template = (template + '').trim();
    return spec;
}