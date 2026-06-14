قرارداد پروژه
کلیات و طراحی پروژه رو از طریق claude design بهت میدم ولی درمورد ساختار کامل برات توضیح میدم

سه تا اپ داریم تو این سه تا پوشه:

app : شامل اپ اصلی که با فلاتر توسعه داده میشه

معماری کلین - riverpod - go router
backend : شامل اپ بک اند برای مدیریت اپ فرانت و اپ فلاتر که با گو توسعه داده میشه

معماری کلین - gin - mysql
frontend : شامل اپ فرانت میشه برای صفحات پابلیک و صفحات پنل ادمین و پنل کاربر و پنل پروژه

نحوه دپلوی :

اپ فلاتر کاری نیاز نیست بشه ولی برای فرانت و بک میخوام داکرایز بشه.

یه فایل sh به اسم docker-debug.sh و یه فایل دیگه به اسم docker-deploy.sh اولی برا تست خودم و دومی میخوام دپلوی کنه. من یه پوشه deploy_example برات درست کردم توش یه سری کد از یه پروژه دیگه ریختم ببینی چه جوری منظورمه.

کدی که مینویسی استاندارد باشه تو هر ۳ تا استک. و آخرین آپدیت هاشون رو هم میخوام نصب کنی و پیاده کنی.

میخوام پورت ها این شکلی بشن :

backend : 3420
front : 3421
mysql : 3422

بعد از اتمام README رو هم کامل کن و یه پوشه docs براش بساز

این کامند طراحی اپ هست برات :
Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/4t-ufF6R6JC273k_cabA3A?open_file=Vodda+User+App.html
Implement: Vodda User App.html

این کامند طراحی وبسایت هست:
Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/iNhNPn2jPd6N6MzzANiWCA?open_file=Vodda+Website.html
Implement: Vodda Website.html

و این هم کامند طراحی پنل های سایت هست:
Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/PMAULGZRHBUqln2gIQW7hg?open_file=Vodda+Panels.html
Implement: Vodda Panels.html

بر اساس این ها شروع کن و چک لیست درست کن هر کار میکنی تو چک لیست ثبت کن منم ببینم.