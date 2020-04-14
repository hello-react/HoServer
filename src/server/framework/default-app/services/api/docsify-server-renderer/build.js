'use strict'

function _interopDefault(ex) {
    return ex && typeof ex === 'object' && 'default' in ex ? ex.default : ex
}

var fetch = _interopDefault(require('node-fetch'))
var marked = _interopDefault(require('marked'))
var Prism = _interopDefault(require('prismjs'))
require('prismjs/components/prism-markup-templating')
var debug = _interopDefault(require('debug'))
var fs = require('fs')
var path = require('path')
var resolvePathname = _interopDefault(require('resolve-pathname'))

function __async(g) {
    return new Promise(function(s, j) {
        function c(a, x) {
            try {
                var r = g[x ? 'throw' : 'next'](a)
            } catch (e) {
                j(e)
                return
            }
            r.done ? s(r.value) : Promise.resolve(r.value).then(c, d)
        }
        function d(e) {
            c(e, 1)
        }
        c()
    })
}

/**
 * Create a cached version of a pure function.
 */
function cached(fn) {
    var cache = Object.create(null)
    return function(str) {
        var key = isPrimitive(str) ? str : JSON.stringify(str)
        var hit = cache[key]
        return hit || (cache[key] = fn(str))
    }
}

var hasOwn = Object.prototype.hasOwnProperty

/**
 * Simple Object.assign polyfill
 */
var merge =
    Object.assign ||
    function(to) {
        var arguments$1 = arguments

        for (var i = 1; i < arguments.length; i++) {
            var from = Object(arguments$1[i])

            for (var key in from) {
                if (hasOwn.call(from, key)) {
                    to[key] = from[key]
                }
            }
        }

        return to
    }

/**
 * Check if value is primitive
 */
function isPrimitive(value) {
    return typeof value === 'string' || typeof value === 'number'
}

/**
 * Perform no operation.
 */
function noop() {}

/**
 * Check if value is function
 */
function isFn(obj) {
    return typeof obj === 'function'
}

/**
 * escape String
 */
function escapeString(string) {
    var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    }

    return String(string).replace(/[&<>"'/]/g, function(s) {
        return entityMap[s]
    })
}

/**
 * Render github corner
 * @param  {Object} data
 * @return {String}
 */
function corner(data, cornerExternalLinkTarge) {
    if (!data) {
        return ''
    }
    if (!/\/\//.test(data)) {
        data = 'https://github.com/' + data
    }
    data = data.replace(/^git\+/, '')
    // double check
    cornerExternalLinkTarge = cornerExternalLinkTarge || '_blank'

    return (
        '<a href="' +
        data +
        '" target="' +
        cornerExternalLinkTarge +
        '" class="github-corner" aria-label="View source on Github">' +
        '<svg viewBox="0 0 250 250" aria-hidden="true">' +
        '<path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>' +
        '<path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path>' +
        '<path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>' +
        '</svg>' +
        '</a>'
    )
}

/**
 * Render main content
 */
function main(config) {
    var name = config.name ? escapeString(config.name) : ''

    var aside =
        '<button class="sidebar-toggle" aria-label="Menu">' +
        '<div class="sidebar-toggle-button">' +
        '<span></span><span></span><span></span>' +
        '</div>' +
        '</button>' +
        '<aside class="sidebar">' +
        (config.name ? '<h1 class="app-name"><a class="app-name-link" data-nosearch>' + (config.logo ? '<img alt="' + name + '" src=' + config.logo + '>' : name) + '</a></h1>' : '') +
        '<div class="sidebar-nav"><!--sidebar--></div>' +
        '</aside>'

    return '<main>' + aside + '<section class="content">' + '<article class="markdown-section" id="main"><!--main--></article>' + '</section>' + '</main>'
}

/**
 * Cover Page
 */
function cover() {
    var SL = ', 100%, 85%'
    var bgc = 'linear-gradient(to left bottom, ' + 'hsl(' + (Math.floor(Math.random() * 255) + SL) + ') 0%,' + 'hsl(' + (Math.floor(Math.random() * 255) + SL) + ') 100%)'

    return '<section class="cover show" style="background: ' + bgc + '">' + '<div class="cover-main"><!--cover--></div>' + '<div class="mask"></div>' + '</section>'
}

/**
 * Render tree
 * @param  {Array} tree
 * @param  {String} tpl
 * @return {String}
 */
function tree(toc, tpl) {
    if (tpl === void 0) tpl = '<ul class="app-sub-sidebar">{inner}</ul>'

    if (!toc || !toc.length) {
        return ''
    }
    var innerHTML = ''
    toc.forEach(function(node) {
        innerHTML += '<li><a class="section-link" href="' + node.slug + '">' + node.title + '</a></li>'
        if (node.children) {
            innerHTML += tree(node.children, tpl)
        }
    })
    return tpl.replace('{inner}', innerHTML)
}

function helper(className, content) {
    return '<p class="' + className + '">' + content.slice(5).trim() + '</p>'
}

var decode = decodeURIComponent
var encode = encodeURIComponent

function parseQuery(query) {
    var res = {}

    query = query.trim().replace(/^(\?|#|&)/, '')

    if (!query) {
        return res
    }

    // Simple parse
    query.split('&').forEach(function(param) {
        var parts = param.replace(/\+/g, ' ').split('=')

        res[parts[0]] = parts[1] && decode(parts[1])
    })

    return res
}

function stringifyQuery(obj, ignores) {
    if (ignores === void 0) ignores = []

    var qs = []

    for (var key in obj) {
        if (ignores.indexOf(key) > -1) {
            continue
        }
        qs.push(obj[key] ? (encode(key) + '=' + encode(obj[key])).toLowerCase() : encode(key))
    }

    return qs.length ? '?' + qs.join('&') : ''
}

var isAbsolutePath = cached(function(path) {
    return /(:|(\/{2}))/g.test(path)
})

var getParentPath = cached(function(path) {
    return /\/$/g.test(path) ? path : (path = path.match(/(\S*\/)[^/]+$/)) ? path[1] : ''
})

var cleanPath = cached(function(path) {
    return path.replace(/^\/+/, '/').replace(/([^:])\/{2,}/g, '$1/')
})

var resolvePath = cached(function(path) {
    var segments = path.replace(/^\//, '').split('/')
    var resolved = []
    for (var i = 0, len = segments.length; i < len; i++) {
        var segment = segments[i]
        if (segment === '..') {
            resolved.pop()
        } else if (segment !== '.') {
            resolved.push(segment)
        }
    }
    return '/' + resolved.join('/')
})

function getPath() {
    var args = []
    var len = arguments.length
    while (len--) args[len] = arguments[len]

    return cleanPath(args.join('/'))
}

var replaceSlug = cached(function(path) {
    return path.replace('#', '?id=')
})

var cached$1 = {}

function getAlias(path, alias, last) {
    var match = Object.keys(alias).filter(function(key) {
        var re = cached$1[key] || (cached$1[key] = new RegExp('^' + key + '$'))
        return re.test(path) && path !== last
    })[0]

    return match ? getAlias(path.replace(cached$1[match], alias[match]), alias, path) : path
}

function getFileName(path, ext) {
    return new RegExp('\\.(' + ext.replace(/^\./, '') + '|html)$', 'g').test(path) ? path : /\/$/g.test(path) ? path + 'README' + ext : '' + path + ext
}

var History = function History(config) {
    this.config = config
}

History.prototype.getBasePath = function getBasePath() {
    return this.config.basePath
}

History.prototype.getFile = function getFile(path, isRelative) {
    if (path === void 0) path = this.getCurrentPath()

    var ref = this
    var config = ref.config
    var base = this.getBasePath()
    var ext = typeof config.ext === 'string' ? config.ext : '.md'

    path = config.alias ? getAlias(path, config.alias) : path
    path = getFileName(path, ext)
    path = path === '/README' + ext ? config.homepage || path : path
    path = isAbsolutePath(path) ? path : getPath(base, path)

    if (isRelative) {
        path = path.replace(new RegExp('^' + base), '')
    }

    return path
}

History.prototype.onchange = function onchange(cb) {
    if (cb === void 0) cb = noop

    cb()
}

History.prototype.getCurrentPath = function getCurrentPath() {}

History.prototype.normalize = function normalize() {}

History.prototype.parse = function parse() {}

History.prototype.toURL = function toURL(path, params, currentRoute) {
    var local = currentRoute && path[0] === '#'
    var route = this.parse(replaceSlug(path))

    route.query = merge({}, route.query, params)
    path = route.path + stringifyQuery(route.query)
    path = path.replace(/\.md(\?)|\.md$/, '$1')

    if (local) {
        var idIndex = currentRoute.indexOf('?')
        path = (idIndex > 0 ? currentRoute.substring(0, idIndex) : currentRoute) + path
    }

    if (this.config.relativePath && path.indexOf('/') !== 0) {
        var currentDir = currentRoute.substring(0, currentRoute.lastIndexOf('/') + 1)
        return cleanPath(resolvePath(currentDir + path))
    }
    return cleanPath('/' + path)
}

var AbstractHistory = /* @__PURE__ */ (function(History) {
    function AbstractHistory(config) {
        History.call(this, config)
        this.mode = 'abstract'
    }

    if (History) AbstractHistory.__proto__ = History
    AbstractHistory.prototype = Object.create(History && History.prototype)
    AbstractHistory.prototype.constructor = AbstractHistory

    AbstractHistory.prototype.parse = function parse(path) {
        var query = ''

        var queryIndex = path ? path.indexOf('?') : -1
        if (queryIndex >= 0) {
            query = path.slice(queryIndex + 1)
            path = path.slice(0, queryIndex)
        }

        return {
            path: path,
            file: this.getFile(path),
            query: parseQuery(query)
        }
    }

    return AbstractHistory
})(History)

/**
 * Gen toc tree
 * @link https://github.com/killercup/grock/blob/5280ae63e16c5739e9233d9009bc235ed7d79a50/styles/solarized/assets/js/behavior.coffee#L54-L81
 * @param  {Array} toc
 * @param  {Number} maxLevel
 * @return {Array}
 */
function genTree(toc, maxLevel) {
    var headlines = []
    var last = {}

    toc.forEach(function(headline) {
        var level = headline.level || 1
        var len = level - 1

        if (level > maxLevel) {
            return
        }
        if (last[len]) {
            last[len].children = (last[len].children || []).concat(headline)
        } else {
            headlines.push(headline)
        }
        last[level] = headline
    })

    return headlines
}

var cache = {}
var re = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g

function lower(string) {
    return string.toLowerCase()
}

function slugify(str) {
    if (typeof str !== 'string') {
        return ''
    }

    var slug = str
        .trim()
        .replace(/[A-Z]+/g, lower)
        .replace(/<[^>\d]+>/g, '')
        .replace(re, '')
        .replace(/\s/g, '-')
        .replace(/-+/g, '-')
        .replace(/^(\d)/, '_$1')
    var count = cache[slug]

    count = hasOwn.call(cache, slug) ? count + 1 : 0
    cache[slug] = count

    if (count) {
        slug = slug + '-' + count
    }

    return slug
}

slugify.clear = function() {
    cache = {}
}

function replace(m, $1) {
    return '<img class="emoji" src="https://github.githubassets.com/images/icons/emoji/' + $1 + '.png" alt="' + $1 + '" />'
}

function emojify(text) {
    return text
        .replace(/<(pre|template|code)[^>]*?>[\s\S]+?<\/(pre|template|code)>/g, function(m) {
            return m.replace(/:/g, '__colon__')
        })
        .replace(/:(\w+?):/gi, replace)
        .replace(/__colon__/g, ':')
}

var cachedLinks = {}

function getAndRemoveConfig(str) {
    if (str === void 0) str = ''

    var config = {}

    if (str) {
        str = str
            .replace(/^'/, '')
            .replace(/'$/, '')
            .replace(/(?:^|\s):([\w-]+)=?([\w-]+)?/g, function(m, key, value) {
                config[key] = (value && value.replace(/&quot;/g, '')) || true
                return ''
            })
            .trim()
    }

    return { str: str, config: config }
}

var compileMedia = {
    markdown: function markdown(url) {
        return {
            url: url
        }
    },
    mermaid: function mermaid(url) {
        return {
            url: url
        }
    },
    iframe: function iframe(url, title) {
        return {
            html: '<iframe src="' + url + '" ' + (title || 'width=100% height=400') + '></iframe>'
        }
    },
    video: function video(url, title) {
        return {
            html: '<video src="' + url + '" ' + (title || 'controls') + '>Not Support</video>'
        }
    },
    audio: function audio(url, title) {
        return {
            html: '<audio src="' + url + '" ' + (title || 'controls') + '>Not Support</audio>'
        }
    },
    code: function code(url, title) {
        var lang = url.match(/\.(\w+)$/)

        lang = title || (lang && lang[1])
        if (lang === 'md') {
            lang = 'markdown'
        }

        return {
            url: url,
            lang: lang
        }
    }
}

var Compiler = function Compiler(config, router) {
    var this$1 = this

    this.config = config
    this.router = router
    this.cacheTree = {}
    this.toc = []
    this.cacheTOC = {}
    this.linkTarget = config.externalLinkTarget || '_blank'
    this.linkRel = this.linkTarget === '_blank' ? config.externalLinkRel || 'noopener' : ''
    this.contentBase = router.getBasePath()

    var renderer = this._initRenderer()
    var compile
    var mdConf = config.markdown || {}

    if (isFn(mdConf)) {
        compile = mdConf(marked, renderer)
    } else {
        marked.setOptions(
            merge(mdConf, {
                renderer: merge(renderer, mdConf.renderer)
            })
        )
        compile = marked
    }

    this._marked = compile
    this.compile = function(text) {
        var isCached = true
        var result = cached(function(_) {
            isCached = false
            var html = ''

            if (!text) {
                return text
            }

            if (isPrimitive(text)) {
                html = compile(text)
            } else {
                html = compile.parser(text)
            }

            html = config.noEmoji ? html : emojify(html)
            slugify.clear()

            return html
        })(text)

        var curFileName = this$1.router.parse().file

        if (isCached) {
            this$1.toc = this$1.cacheTOC[curFileName]
        } else {
            this$1.cacheTOC[curFileName] = [].concat(this$1.toc)
        }

        return result
    }
}

Compiler.prototype.compileEmbed = function compileEmbed(href, title) {
    var ref = getAndRemoveConfig(title)
    var str = ref.str
    var config = ref.config
    var embed
    title = str

    if (config.include) {
        if (!isAbsolutePath(href)) {
            href = getPath('', getParentPath(this.router.getCurrentPath()), href)
        }

        var media
        if (config.type && (media = compileMedia[config.type])) {
            embed = media.call(this, href, title)
            embed.type = config.type
        } else {
            var type = 'code'
            if (/\.(md|markdown)/.test(href)) {
                type = 'markdown'
            } else if (/\.mmd/.test(href)) {
                type = 'mermaid'
            } else if (/\.html?/.test(href)) {
                type = 'iframe'
            } else if (/\.(mp4|ogg)/.test(href)) {
                type = 'video'
            } else if (/\.mp3/.test(href)) {
                type = 'audio'
            }
            embed = compileMedia[type].call(this, href, title)
            embed.type = type
        }
        embed.fragment = config.fragment

        return embed
    }
}

Compiler.prototype._matchNotCompileLink = function _matchNotCompileLink(link) {
    var links = this.config.noCompileLinks || []

    for (var i = 0; i < links.length; i++) {
        var n = links[i]
        var re = cachedLinks[n] || (cachedLinks[n] = new RegExp('^' + n + '$'))

        if (re.test(link)) {
            return link
        }
    }
}

Compiler.prototype._initRenderer = function _initRenderer() {
    var renderer = new marked.Renderer()
    var ref = this
    var linkTarget = ref.linkTarget
    var linkRel = ref.linkRel
    var router = ref.router
    var contentBase = ref.contentBase
    var _self = this
    var origin = {}

    /**
     * Render anchor tag
     * @link https://github.com/markedjs/marked#overriding-renderer-methods
     */
    origin.heading = renderer.heading = function(text, level) {
        var ref = getAndRemoveConfig(text)
        var str = ref.str
        var config = ref.config
        var nextToc = { level: level, title: str }

        if (/{docsify-ignore}/g.test(str)) {
            str = str.replace('{docsify-ignore}', '')
            nextToc.title = str
            nextToc.ignoreSubHeading = true
        }

        if (/{docsify-ignore-all}/g.test(str)) {
            str = str.replace('{docsify-ignore-all}', '')
            nextToc.title = str
            nextToc.ignoreAllSubs = true
        }

        var slug = slugify(config.id || str)
        var url = router.toURL(router.getCurrentPath(), { id: slug })
        nextToc.slug = url
        _self.toc.push(nextToc)

        return '<h' + level + ' id="' + slug + '"><a href="' + url + '" data-id="' + slug + '" class="anchor"><span>' + str + '</span></a></h' + level + '>'
    }
    // Highlight code
    origin.code = renderer.code = function(code, lang) {
        if (lang === void 0) lang = ''

        code = code.replace(/@DOCSIFY_QM@/g, '`')
        var hl = Prism.highlight(code, Prism.languages[lang] || Prism.languages.markup)

        return '<pre v-pre data-lang="' + lang + '"><code class="lang-' + lang + '">' + hl + '</code></pre>'
    }
    origin.link = renderer.link = function(href, title, text) {
        if (title === void 0) title = ''

        var attrs = ''

        var ref = getAndRemoveConfig(title)
        var str = ref.str
        var config = ref.config
        title = str

        if (!isAbsolutePath(href) && !_self._matchNotCompileLink(href) && !config.ignore) {
            if (href === _self.config.homepage) {
                href = 'README'
            }
            href = router.toURL(href, null, router.getCurrentPath())
        } else {
            attrs += href.indexOf('mailto:') === 0 ? '' : ' target="' + linkTarget + '"'
            attrs += href.indexOf('mailto:') === 0 ? '' : linkRel !== '' ? ' rel="' + linkRel + '"' : ''
        }

        if (config.target) {
            attrs += ' target=' + config.target
        }

        if (config.disabled) {
            attrs += ' disabled'
            href = 'javascript:void(0)'
        }

        if (title) {
            attrs += ' title="' + title + '"'
        }

        return '<a href="' + href + '"' + attrs + '>' + text + '</a>'
    }
    origin.paragraph = renderer.paragraph = function(text) {
        var result
        if (/^!&gt;/.test(text)) {
            result = helper('tip', text)
        } else if (/^\?&gt;/.test(text)) {
            result = helper('warn', text)
        } else {
            result = '<p>' + text + '</p>'
        }
        return result
    }
    origin.image = renderer.image = function(href, title, text) {
        var url = href
        var attrs = ''

        var ref = getAndRemoveConfig(title)
        var str = ref.str
        var config = ref.config
        title = str

        if (config['no-zoom']) {
            attrs += ' data-no-zoom'
        }

        if (title) {
            attrs += ' title="' + title + '"'
        }

        var size = config.size
        if (size) {
            var sizes = size.split('x')
            if (sizes[1]) {
                attrs += 'width=' + sizes[0] + ' height=' + sizes[1]
            } else {
                attrs += 'width=' + sizes[0]
            }
        }

        if (!isAbsolutePath(href)) {
            url = getPath(contentBase, getParentPath(router.getCurrentPath()), href)
        }

        return '<img src="' + url + '"data-origin="' + href + '" alt="' + text + '"' + attrs + '>'
    }
    origin.list = renderer.list = function(body, ordered, start) {
        var isTaskList = /<li class="task-list-item">/.test(body.split('class="task-list"')[0])
        var isStartReq = start && start > 1
        var tag = ordered ? 'ol' : 'ul'
        var tagAttrs = [isTaskList ? 'class="task-list"' : '', isStartReq ? 'start="' + start + '"' : ''].join(' ').trim()

        return '<' + tag + ' ' + tagAttrs + '>' + body + '</' + tag + '>'
    }
    origin.listitem = renderer.listitem = function(text) {
        var isTaskItem = /^(<input.*type="checkbox"[^>]*>)/.test(text)
        var html = isTaskItem ? '<li class="task-list-item"><label>' + text + '</label></li>' : '<li>' + text + '</li>'

        return html
    }

    renderer.origin = origin

    return renderer
}

/**
 * Compile sidebar
 */
Compiler.prototype.sidebar = function sidebar(text, level) {
    var ref = this
    var toc = ref.toc
    var currentPath = this.router.getCurrentPath()
    var html = ''

    if (text) {
        html = this.compile(text)
    } else {
        for (var i = 0; i < toc.length; i++) {
            if (toc[i].ignoreSubHeading) {
                var deletedHeaderLevel = toc[i].level
                toc.splice(i, 1)
                // Remove headers who are under current header
                for (var j = i; deletedHeaderLevel < toc[j].level && j < toc.length; j++) {
                    toc.splice(j, 1) && j-- && i++
                }
                i--
            }
        }
        var tree$1 = this.cacheTree[currentPath] || genTree(toc, level)
        html = tree(tree$1, '<ul>{inner}</ul>')
        this.cacheTree[currentPath] = tree$1
    }

    return html
}

/**
 * Compile sub sidebar
 */
Compiler.prototype.subSidebar = function subSidebar(level) {
    if (!level) {
        this.toc = []
        return
    }
    var currentPath = this.router.getCurrentPath()
    var ref = this
    var cacheTree = ref.cacheTree
    var toc = ref.toc

    toc[0] && toc[0].ignoreAllSubs && toc.splice(0)
    toc[0] && toc[0].level === 1 && toc.shift()

    for (var i = 0; i < toc.length; i++) {
        toc[i].ignoreSubHeading && toc.splice(i, 1) && i--
    }
    var tree$1 = cacheTree[currentPath] || genTree(toc, level)

    cacheTree[currentPath] = tree$1
    this.toc = []
    return tree(tree$1)
}

Compiler.prototype.article = function article(text) {
    return this.compile(text)
}

/**
 * Compile cover page
 */
Compiler.prototype.cover = function cover(text) {
    var cacheToc = this.toc.slice()
    var html = this.compile(text)

    this.toc = cacheToc.slice()

    return html
}

var cached$2 = {}

function walkFetchEmbed(ref, cb) {
    var embedTokens = ref.embedTokens
    var compile = ref.compile
    var fetch = ref.fetch

    var token
    var step = 0
    var count = 1

    if (!embedTokens.length) {
        return cb({})
    }

    while ((token = embedTokens[step++])) {
        var next = (function(token) {
            return function(text) {
                var embedToken
                if (text) {
                    if (token.embed.type === 'markdown') {
                        embedToken = compile.lexer(text)
                    } else if (token.embed.type === 'code') {
                        if (token.embed.fragment) {
                            var fragment = token.embed.fragment
                            var pattern = new RegExp('(?:###|\\/\\/\\/)\\s*\\[' + fragment + '\\]([\\s\\S]*)(?:###|\\/\\/\\/)\\s*\\[' + fragment + '\\]')
                            text = ((text.match(pattern) || [])[1] || '').trim()
                        }
                        embedToken = compile.lexer('```' + token.embed.lang + '\n' + text.replace(/`/g, '@DOCSIFY_QM@') + '\n```\n')
                    } else if (token.embed.type === 'mermaid') {
                        embedToken = [{ type: 'html', text: '<div class="mermaid">\n' + text + '\n</div>' }]
                        embedToken.links = {}
                    } else {
                        embedToken = [{ type: 'html', text: text }]
                        embedToken.links = {}
                    }
                }
                cb({ token: token, embedToken: embedToken })
                if (++count >= step) {
                    cb({})
                }
            }
        })(token)

        if (token.embed.url) {
            {
                fetch(token.embed.url).then(next)
            }
        } else {
            next(token.embed.html)
        }
    }
}

function prerenderEmbed(ref, done) {
    var compiler = ref.compiler
    var raw = ref.raw
    if (raw === void 0) raw = ''
    var fetch = ref.fetch

    var hit = cached$2[raw]
    if (hit) {
        var copy = hit.slice()
        copy.links = hit.links
        return done(copy)
    }

    var compile = compiler._marked
    var tokens = compile.lexer(raw)
    var embedTokens = []
    var linkRE = compile.InlineLexer.rules.link
    var links = tokens.links

    tokens.forEach(function(token, index) {
        if (token.type === 'paragraph') {
            token.text = token.text.replace(new RegExp(linkRE.source, 'g'), function(src, filename, href, title) {
                var embed = compiler.compileEmbed(href, title)

                if (embed) {
                    embedTokens.push({
                        index: index,
                        embed: embed
                    })
                }

                return src
            })
        }
    })

    var moveIndex = 0
    walkFetchEmbed({ compile: compile, embedTokens: embedTokens, fetch: fetch }, function(ref) {
        var embedToken = ref.embedToken
        var token = ref.token

        if (token) {
            var index = token.index + moveIndex

            merge(links, embedToken.links)

            tokens = tokens.slice(0, index).concat(embedToken, tokens.slice(index + 1))
            moveIndex += embedToken.length - 1
        } else {
            cached$2[raw] = tokens.concat()
            tokens.links = cached$2[raw].links = links
            done(tokens)
        }
    })
}

function cwd() {
    var args = []
    var len = arguments.length
    while (len--) args[len] = arguments[len]

    return path.resolve.apply(void 0, [process.cwd()].concat(args))
}

function mainTpl(config) {
    var html = '<nav class="app-nav' + (config.repo ? '' : ' no-badge') + '"><!--navbar--></nav>'

    if (config.repo) {
        html += corner(config.repo)
    }
    if (config.coverpage) {
        html += cover()
    }

    html += main(config)

    return html
}

var Renderer = function Renderer(ref) {
    var this$1 = this
    var template = ref.template
    var config = ref.config
    var cache = ref.cache

    this.html = template
    this.config = config = Object.assign({}, config, {
        routerMode: 'history'
    })
    this.cache = cache

    this.router = new AbstractHistory(config)
    this.compiler = new Compiler(config, this.router)

    this.router.getCurrentPath = function() {
        return this$1.url
    }
    this._renderHtml('inject-config', '<script>window.$docsify = ' + JSON.stringify(config) + '</script>')
    this._renderHtml('inject-app', mainTpl(config))

    this.template = this.html
}

Renderer.prototype._getPath = function _getPath(url) {
    var file = this.router.getFile(url)

    return isAbsolutePath(file) ? file : cwd('./' + file)
}

Renderer.prototype.renderToString = function renderToString(url) {
    return __async(
        function*() {
            this.url = url = this.router.parse(url).path
            var ref = this.config
            var loadSidebar = ref.loadSidebar
            var loadNavbar = ref.loadNavbar
            var coverpage = ref.coverpage

            var mainFile = this._getPath(url)
            this._renderHtml('main', yield this._render(mainFile, 'main'))

            if (loadSidebar) {
                var name = loadSidebar === true ? '_sidebar.md' : loadSidebar
                var sidebarFile = this._getPath(path.resolve(url, './' + name))
                this._renderHtml('sidebar', yield this._render(sidebarFile, 'sidebar'))
            }

            if (loadNavbar) {
                var name$1 = loadNavbar === true ? '_navbar.md' : loadNavbar
                var navbarFile = this._getPath(path.resolve(url, './' + name$1))
                this._renderHtml('navbar', yield this._render(navbarFile, 'navbar'))
            }

            if (coverpage) {
                var path$1 = null
                if (typeof coverpage === 'string') {
                    if (url === '/') {
                        path$1 = coverpage
                    }
                } else if (Array.isArray(coverpage)) {
                    path$1 = coverpage.indexOf(url) > -1 && '_coverpage.md'
                } else {
                    var cover = coverpage[url]
                    path$1 = cover === true ? '_coverpage.md' : cover
                }

                var coverFile = this._getPath(path.resolve(url, './' + path$1))

                this._renderHtml('cover', yield this._render(coverFile), 'cover')
            }

            var html = this.html
            this.html = this.template

            return html
        }.call(this)
    )
}

Renderer.prototype._renderHtml = function _renderHtml(match, content) {
    this.html = this.html.replace(new RegExp('<!--' + match + '-->', 'g'), content)

    return this.html
}

Renderer.prototype._render = function _render(path, type) {
    return __async(
        function*() {
            var this$1 = this

            var html = yield this._loadFile(path)
            var ref = this.config
            var subMaxLevel = ref.subMaxLevel
            var maxLevel = ref.maxLevel
            var tokens

            switch (type) {
                case 'sidebar':
                    html = this.compiler.sidebar(html, maxLevel) + '<script>window.__SUB_SIDEBAR__ = ' + JSON.stringify(this.compiler.subSidebar(subMaxLevel)) + '</script>'
                    break
                case 'cover':
                    html = this.compiler.cover(html)
                    break
                case 'main':
                    tokens = yield new Promise(function(r) {
                        prerenderEmbed(
                            {
                                fetch: function(url) {
                                    return this$1._loadFile(this$1._getPath(url))
                                },
                                compiler: this$1.compiler,
                                raw: html
                            },
                            r
                        )
                    })
                    html = this.compiler.compile(tokens)
                    break
                case 'navbar':
                case 'article':
                default:
                    html = this.compiler.compile(html)
                    break
            }

            return html
        }.call(this)
    )
}

Renderer.prototype._loadFile = function _loadFile(filePath) {
    return __async(
        function*() {
            var content
            try {
                if (isAbsolutePath(filePath)) {
                    var res = yield fetch(filePath)
                    if (!res.ok) {
                        throw Error()
                    }
                    content = yield res.text()
                    this.lock = 0
                } else {
                    content = yield fs.readFileSync(filePath, 'utf8')
                    this.lock = 0
                }
                return content
            } catch (e) {
                this.lock = this.lock || 0
                if (++this.lock > 10) {
                    this.lock = 0
                    return
                }

                var fileName = path.basename(filePath)
                var result = yield this._loadFile(resolvePathname('../' + fileName, filePath))

                return result
            }
        }.call(this)
    )
}

Renderer.version = '4.10.2'

module.exports = Renderer
