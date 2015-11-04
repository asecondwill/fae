/* global Fae, judge, FCH */

'use strict';

/**
 * Fae form validator
 * @namespace form.validator
 * @memberof form
 */
Fae.form.validator = {

  is_valid: '',

  init: function () {
    if ($('form').length) {
      this.password_confirmation_validation.init();
      this.passwordPresenceConditional();
      this.bindValidationEvents();
      this.formValidate();
      this.length_counter.init();
    }
  },

  /**
   * Validate the entire form on submit and stop it if the form is invalid
   * @fires {@link navigation.language.checkForHiddenErrors}
   */
  formValidate: function () {
    var _this = this;
    FCH.$document.on('submit', 'form', function (e) {
      _this.is_valid = true;

      $('[data-validate]').each(function () {
        if ($(this).data('validate').length) {
          _this.judge_it($(this));
        }
      });

      if (_this.is_valid === false) {
        Fae.navigation.language.checkForHiddenErrors();
        FCH.smoothScroll($('#main_header'), 500, 100, 0);
        e.preventDefault();
      }

      if ($(".field_with_errors").length){
        $('.alert').slideDown('fast').removeClass('hide').delay(3000).slideUp('fast');
      }
    });
  },

  /**
   * Bind validation events based on input type
   */
  bindValidationEvents: function () {
    var _this = this;

    $('[data-validate]').each(function () {
      var $this = $(this);

      if ($this.data('validate').length) {
        if ($this.is('input:not(.hasDatepicker), textarea')) {
          // normal inputs validate on blur
          $this.blur(function () {
            _this.judge_it($this);
          });

        } else if ($this.hasClass('hasDatepicker')) {
          // date pickers need a little delay
          $this.blur(function () {
            setTimeout(function(){ _this.judge_it($this); }, 500);
          });

        } else if ($this.is('select')) {
          // selects validate on change
          $this.change(function () {
            _this.judge_it($this);
          });
        }
      }
    });
  },


  // main judge call
  judge_it: function ($input) {
    var _this = this;

    judge.validate($input[0], {
      valid: function () {
        _this._createSuccessClass($input);
      },
      invalid: function (input, messages) {
        _this.is_valid = false;
        _this.label_named_message($input, messages);
        _this._createOrReplaceError($input, messages);
      }
    });
  },

  /**
   * Determines if field is a chosen input
   * @access protected
   * @param {jQuery} $input - Input field (can be a chosen object)
   * @return {Boolean}
   */
  _isChosen: function ($input) {
    return $input.next('.chosen-container').length;
  },



  label_named_message: function ($el, messages) {
    var $label;
    var index = 0;

    if ($el.is(':radio')) {
      $label = $el.parent().closest('span').siblings('label');
    } else {
      $label = $el.siblings('label');
    }

    if ($label.get(0).childNodes[0].nodeName === "ABBR") {
      index = 1;
    }

    for (var i = messages.length - 1; i >= 0; i--) {
      messages[i] = $label.get(0).childNodes[index].nodeValue + " " + messages[i];
    }
  },


  /**
   * Adds and removes the appropriate classes to display the success styles
   * @access protected
   * @param {jQuery} $input - Input field (can be a chosen object)
   */
  _createSuccessClass: function ($input) {
    var $styled_input = this._setChosenInput($input);
    $styled_input.addClass('valid').removeClass('invalid');

    $input.parent().removeClass('field_with_errors').children('.error').remove();
  },

  /**
   * @access protected
   * Adds and removes the appropriate classes to display the error styles
   * @param {jQuery} $input - Input field
   * @param {Array} messages - Error messages to display
   */
  _createOrReplaceError: function ($input, messages) {
    var $styled_input = this._setChosenInput($input);
    $styled_input.addClass('invalid').removeClass('valid');

    var $wrapper = $input.closest('.input');
    if ($wrapper.children('.error').length) {
      $wrapper.children('.error').text(messages.join(','));
    } else {
      $wrapper.addClass('field_with_errors').append("<span class='error'>" + messages.join(',') + "</span>");
    }
  },

  /**
   * A DRY method for setting the element that should take the .valid or .invalid style
   * @access protected
   * @param {jQuery} $input - Input field for a chosen object
   * @return {jQuery} The chosen container
   */
  _setChosenInput: function ($input) {
    var $styled_input = $input;

    if (this._isChosen($input)) {
      if ($input.next('.chosen-container').find('.chosen-single').length) {
        $styled_input = $input.next('.chosen-container').find('.chosen-single');
      } else if ($input.next('.chosen-container').find('.chosen-choices').length) {
        $styled_input = $input.next('.chosen-container').find('.chosen-choices');
      }
    }

    return $styled_input;
  },

  /**
   * Removes a field's Judge validation
   * @param {jQuery} $field - Input fields
   * @param {String} kind - Type of validation (e.g. 'presence' or 'confirmation')
   */
  stripValidation: function($field, kind) {
    var validations = $field.data('validate');

    for (var i = 0; i < validations.length; i++) {
      // validation items can be strings or JSON objects
      // let's convert the strings to JSON so we're dealing with consistent types
      if (typeof validations[i] == 'string' || validations[i] instanceof String) {
        validations[i] = JSON.parse(validations[i]);
      }

      // if the kind matches, remove it from the array
      if (validations[i]['kind'] === kind) {
        validations.splice(i, 1);
      }

      // convert JSON back to a string
      validations[i] = JSON.stringify(validations[i]);
    }
    $field.attr('data-validate', '[' + validations + ']');
  },

  /**
   * Password Confirmation Validation
   * @description Judge validates confirmation on the original field. This is a hack to remove Judge's validation and add it to the confirmation field
   * @namespace
   * @memberof! validator
   */
  password_confirmation_validation: {
    init: function() {
      var _this = this;

      _this.$password_field = $('#user_password');
      _this.$password_confirmation_field = $('#user_password_confirmation');

      if (_this.$password_confirmation_field.length) {
        Fae.form.validator.stripValidation(_this.$password_field, 'confirmation');
        _this.addCustomValidation();
      }
    },

    /**
     * Validate password on blur and form submit; halt form execution if invalid
     */
    addCustomValidation: function() {
      var _this = this;

      _this.$password_confirmation_field.on('blur', function() {
        _this._validateConfirmation(_this);
      });

      $('form').on('submit', function(ev) {
        _this.is_valid = true;
        _this._validateConfirmation(_this);

        if (!_this.is_valid) {
          ev.preventDefault();
        }
      });
    },

    /**
     * Displays success or error depending on password validation
     * @access protected
     * @param {Object} self - The password_confirmation_validation object
     * @see {@link validator.password_confirmation_validation.addCustomValidation addCustomValidation}
     */
    _validateConfirmation: function(self) {
      var validator = Fae.form.validator;

      if (self.$password_field.val() === self.$password_confirmation_field.val()) {
        validator._createSuccessClass(self.$password_confirmation_field);
      } else {
        var message = ['must match Password'];
        validator.is_valid = false;
        validator.label_named_message(self.$password_confirmation_field, message);
        validator._createOrReplaceError(self.$password_confirmation_field, message);
      }
    }
  },

  /**
   * Judge always read the `on: :create` validations, so we need to strip the password presence validation on the user edit form
   */
  passwordPresenceConditional: function() {
    var $edit_user_password = $('.edit_user #user_password');
    if ($edit_user_password.length) {
      this.stripValidation($edit_user_password, 'presence');
    }
  },

  /**
   * Length Counter
   * @namespace
   * @memberof! validator
   */
  length_counter: {

    init: function(){
      this.findLengthValidations();
    },

    /**
     * Add counter text to fields that validate based on character counts
     */
    findLengthValidations: function() {
      var _this = this;

      $('[data-validate]').each(function () {
        var $this = $(this);

        if ($this.data('validate').length ) {
          var validations = $this.data('validate');

          $.grep(validations, function(item){
            if (item.kind === 'length'){
              var max = item.options.maximum;
              _this._setCounter($this, max);
            }
          });
        }
      });
    },

    /**
     * Display characters left/available in a text field
     * @access protected
     * @param {jQuery} $elem - Input field to evaluate
     * @param {Number} max - Maximum length of characters in field
     * @param {Number} current[current=max minus current field length] - Countdown from full length, usually max - present length
     */
    _setCounter: function($elem, max, current) {
      current = current || 0 + (max - $elem.val().length);

      var text = this.__createCounterText($elem, max, current);

      if ($elem.siblings('.counter').length) {
        $elem.siblings('.counter').remove();
        this.__createCounterElem($elem, max, current, text);
      } else {
        this.__createCounterElem($elem, max, current, text);
        this.__addCounterListener($elem, max);
      }
    },

    /**
     * Textual representation of characters left in field
     * @access protected
     * @param {jQuery} $elem - Input field to evaluate
     * @param {Number} max - Maximum length of characters in field
     * @param {Number} [current=max minus current field length] - Countdown from full length, usually max - present length
     * @return {HTML}
     * @see {@link validator.length_counter._setCounter _setCounter}
     */
    __createCounterText: function($elem, max, current) {
      var prep = "Maximum Characters: " + max;
      var text = "Characters Left: ";
      if (current < 0) {
        text = "Characters Over: ";
      }
      if (current > 0 || $elem.val().length > 0) {
        prep += " / <span class='characters-left'>" + text + Math.abs(current) + "</span>";
      }
      return prep;
    },

    /**
     * Add counter display to DOM
     * @access protected
     * @param {jQuery} $elem - Input field being counted
     * @param {Number} max - Maximum length of characters in field
     * @param {Number} [current=max minus current field length] - Countdown from full length, usually max - present length
     * @see {@link validator.length_counter._setCounter _setCounter}
     */
    __createCounterElem: function($elem, max, current, text){
      var $counter_div = $('<div />', {
        class: 'counter',
        data: {
          max: max,
          current: current
        },
        html: '<p>' + text + '</p>'
      });

      $elem.after( $counter_div );

      if (current <= 0 || $elem.val().length >= 100){
        $elem.siblings('.counter').children('p').children('.characters-left').addClass('overCount');
      }
    },

    /**
     * Set counter on input change
     * @access protected
     * @param {jQuery} $elem - Input field being counted
     * @param {Number} max - Maximum length of characters in field
     * @see {@link validator.length_counter._setCounter _setCounter}
     */
    __addCounterListener: function($elem, max) {
      var _this = this;
      $elem.keyup(function() {
        var current = (max - ($elem.val().length));
        _this._setCounter($elem, max, current);
      });
      $elem.keypress(function(e) {
        var current = (max - $elem.val().length);
        if (current <= 0) {
          if (e.keyCode !== 8 && e.keyCode !== 46) {
            e.preventDefault();
          }
        }
      });
    }
  },

};
