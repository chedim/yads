!function ($) {
    $.fn.slides = function () {
        var methods = this.data('slides');
        if (this.data('slides')) {
            for (i in methods) {
                this[i] = methods[i];
            }
            return this;
        }
        methods = {};
        //useful variables
        var currentItemIndex = 0, itemsWidth = [];
        // collecting images
        var items = $('img', this);
        items.each(function (i, el) {
            itemsWidth.push($(el).outerWidth());
            $(el).detach();
        });

        // generating ui
        var wrapper = $('<div/>'), prevBtn = $('<div/>'), nextBtn = $('<div/>');
        wrapper.addClass('slides-wrapper');
        $(wrapper).innerWidth(this.innerWidth());

        $(wrapper).append(items[currentItemIndex]);

        $(this).html('').append(wrapper);
        $(this).addClass('slides');
        prevBtn.addClass('prev');
        nextBtn.addClass('next');
        this.append(prevBtn, nextBtn);

        // some control functions
        var animations = 0, animationListeners = [], lastAnimateTarget = 0;
        var navigateTo = function (nextIndex, callback, backwards) {
            var startIndex = currentItemIndex;
            currentItemIndex = nextIndex;
            wrapper.innerWidth(wrapper.innerWidth() + itemsWidth[nextIndex]);
            var animateTarget = 0;
            if (backwards) {
                wrapper.prepend(items[nextIndex]);
                animateTarget = lastAnimateTarget;
                wrapper.css({left: lastAnimateTarget - itemsWidth[nextIndex]});
            } else {
                wrapper.append(items[nextIndex]);
                animateTarget = lastAnimateTarget - itemsWidth[startIndex];
            }
            animations++;
            lastAnimateTarget = animateTarget;

            var animationListener = function () {
                $(items[startIndex]).detach();
                if (callback) {
                    callback();
                }
            };
            wrapper.animate({left: animateTarget}, {
                done: function () {
                    animationListeners.push(animationListener);
                    if (--animations <= 0) {
                        animations = 0;
                        lastAnimateTarget = 0;
                        for (var i = 0; i < animationListeners.length; i++) {
                            animationListeners[i]();
                        }
                        animationListeners = [];
                        wrapper.css({left: 0});
                        wrapper.innerWidth(itemsWidth[currentItemIndex]);
                    }
                }
            });
        }

        var autoScrollInterval = 0;
        methods.nextSlide = this.nextSlide = function () {
            autoScrollInterval = 0;
            navigateTo((currentItemIndex + 1) % items.length);
        }
        methods.prevSlide = this.prevSlide = function () {
            autoScrollInterval = 0;
            navigateTo((items.length + (currentItemIndex - 1)) % items.length, undefined, true);
        }

        methods.autoScroll = this.autoScroll = function (interval) {
            var dontStart = autoScrollInterval > 0;
            autoScrollInterval = interval;
            if (dontStart) return;
                var autoNext = function () {
                if (autoScrollInterval > 0) {
                    navigateTo((currentItemIndex + 1) % items.length, function () {
                        if (autoScrollInterval > 0)
                            setTimeout(autoNext, autoScrollInterval);
                    });
                }
            }
            autoNext();
        }


        // navigation elements
        prevBtn.click(this.prevSlide);
        nextBtn.click(this.nextSlide);

        this.data('slides', methods);
        return this;
    }
}(jQuery);