---
layout: default
permalink: /vi/blog/
title: Blog
lang: vi
lang_alt: /blog/
nav: true
nav_order: 4
pagination:
  enabled: true
  collection: posts
  locale: vi # chỉ liệt kê bài tiếng Việt (_posts/vi/)
  permalink: /page/:num/
  per_page: 5
  sort_field: date
  sort_reverse: true
  trail:
    before: 1 # The number of links before the current page
    after: 3 # The number of links after the current page
---

{% include blog_list.liquid %}
