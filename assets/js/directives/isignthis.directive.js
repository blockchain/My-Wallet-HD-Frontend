angular
  .module('walletApp')
  .directive('isignthis', isignthis);

function isignthis ($sce, Options) {
  const directive = {
    restrict: 'E',
    scope: {
      onResize: '&',
      onComplete: '=',
      paymentInfo: '=',
      transactionId: '='
    },
    template: `
      <iframe
        ng-src='{{ url }}'
        sandbox='allow-same-origin allow-scripts allow-forms'
        scrolling = 'no'
        id='isx-iframe'
        ng-if='showFrame'
      ></iframe>
    `,
    link: link
  };
  return directive;

  function link (scope, elem, attrs) {
    scope.$watch('transactionId', (newValue) => {
      if (newValue) {
        scope.iSignThisFrame(newValue);
      }
    });

    let iSignThisDomain;

    let processOptions = (options) => {
      iSignThisDomain = options.partners.coinify.iSignThisDomain;
    };

    if (Options.didFetch) {
      processOptions(Options.options);
    } else {
      Options.get().then(processOptions);
    }

    scope.iSignThisFrame = (iSignThisID) => {
      // TODO: use elem or avoid usage alltogether:
      var e = document.getElementById('isx-iframe');

      scope.url = $sce.trustAsResourceUrl(`${iSignThisDomain}/landing/${iSignThisID}?embed=true`);

      // iSignThis iframe contoller code, TODO:
      // * Angularize

      // Script loaded by demo
      var _isx = {
        transactionId: '',
        version: '1.0.0',
        configOptions: null
      };

      _isx.applyContainerStyles = function (c) {
        c.style['width'] = '100%';
        if (this.configOptions.height) {
          c.style['height'] = this.configOptions.height;
        } else {
          c.style['height'] = '700px';
        }
        c.style['overflow'] = 'hidden';
      };

      _isx.setup = function (setup) {
        this.transactionId = setup.transaction_id;

        this.configOptions = setup;

        return this;
      };

      _isx.done = function (_completeListener) {
        this.completeListener = _completeListener;
        return this;
      };

      _isx.fail = function (_errorListener) {
        this.errorListener = _errorListener;
        return this;
      };

      _isx.route = function (_routeListener) {
        this.routeListener = _routeListener;
        return this;
      };

      _isx.resized = function (_resizeListener) {
        this.resizeListener = _resizeListener;
        return this;
      };

      _isx.publish = function () {
        this.iframe = e;

        // Create IE + others compatible event handler
        var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
        var eventer = window[eventMethod];
        var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message';

        var self = this;

        // Listen to message from child window
        eventer(messageEvent, function (e) {
          // Check for the domain who sent the messageEvent
          var origin = e.origin || e.originalEvent.origin;
          if (origin !== iSignThisDomain) {
            // Event not generated from ISX, simply return
            return;
          }

          var frame = document.getElementById('isx-iframe');
          if (e.source !== frame.contentWindow) {
            // Source of message isn't from the iframe
            return;
          }

          try {
            var d = JSON.parse(e.data.split('[ISX-Embed]')[1]);

            if (d.event.toLowerCase() === 'complete') {
              if (self.completeListener) {
                self.completeListener(d);
              }
            } else if (d.event.toLowerCase() === 'route') {
              if (self.routeListener) {
                self.routeListener(d);
              }
            } else if (d.event.toLowerCase() === 'error') {
              if (self.errorListener) {
                self.errorListener(d);
              }
            } else if (d.event.toLowerCase() === 'resized') {
              if (self.resizeListener) {
                self.resizeListener(d);
              }
            }
          } catch (err) {
            console.log('err caught:', err);
          }
        }, false);

        return this;
      };

      // window.isignthis = _isx;

      // Inline Javascript from demo:
      var widget = {
        transaction_id: iSignThisID,
        container_id: 'isx-iframe',
        minimum_height: 400
      };

      var setState = (state) => {
        switch (state) {
          case 'SUCCESS.MANUAL_ACCEPTED':
          case 'SUCCESS.COMPLETE':
            scope.onComplete('processing');
            break;
          case 'CANCELLED.CANCELLED':
            scope.onComplete('cancelled');
            break;
          case 'EXPIRED.EXPIRED':
            scope.onComplete('expired');
            break;
          case 'DECLINED.CARD_ISSUER_COUNTRY':
          case 'DECLINED.SPLIT_TOKEN_DENIED':
          case 'DECLINED.TOO_MANY_ATTEMPTS':
          case 'DECLINED.OTP_TOKEN_DENIED':
          case 'DECLINED.UNKNOWN_ERROR':
          case 'FAILED.UNEXPECTED_ERROR':
          case 'REJECTED.UPSTREAM_REJECTED':
            scope.onComplete('rejected');
            break;
          case 'PENDING.PROCESSING_DOCUMENT':
          case 'PROCESSING_DOCUMENT.PENDING':
          case 'PENDING.MANUAL_REVIEW':
            scope.onComplete('reviewing');
            break;
        }
      };

      scope.showFrame = true;

      _isx
        .setup(widget)
        .done(function (e) {
          console.log('completed. e=', JSON.stringify(e));

          setState(e.compound_state);
        })
        .fail(function (e) {
          console.log('error. e=' + JSON.stringify(e));
        })
        .resized(function (e) {
          console.log('resized. e=', JSON.stringify(e));
        })
        .route(function (e) {
          console.log('route. e=' + JSON.stringify(e));

          scope.paymentInfo = e.route.match('/otp|/verify-pin|/kyc');
          scope.onResize({step: e.route.match(/\/(.*)\//)[1]});

          setState(e.compound_state);
        })
        .publish();
    };
  }
}
