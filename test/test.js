var chai = require('chai')
var expect = chai.expect

var argtyper = require('../js/index')

var type = argtyper.type
var typeAll = argtyper.typeAll
var typedef = argtyper.typedef

// Define a test function
function add (a = Number, b = Number) {
  return a + b
}

add = type(add) // eslint-disable-line

describe('argtyper', function () {
  it('should allow correctly typed arguments', () => {
    expect(() => {
      add(5, 5)
    }).to.not.throw(Error).and.to.equal(10)

    expect(() => {
      add(5, true)
    }).to.throw(Error)
  })

  it('should disallow arguments without explicit types', () => {
    expect(() => {
      type((a, b) => { return a + b })
    }).to.throw(Error)
  })

  it('should disallow too few arguments', () => {
    expect(() => {
      add(5)
    }).to.throw(Error)
  })

  it('should disallow too many arguments', () => {
    expect(() => {
      add(1, 2, 3)
    }).to.throw(Error)
  })

  it('should work with \'|\' to allow polymorphic constraints', () => {
    const fn = type(function (a = Number | String) {})

    expect(() => {
      fn(5)
    }).to.not.throw(Error)

    expect(() => {
      fn('hello')
    }).to.not.throw(Error)

    expect(() => {
      fn(true)
    }).to.throw(Error)
  })

  it('should work with \'Any\' to allow untyped arguments', () => {
    const fn = type(function (a = Any, b = String) {})

    expect(() => {
      fn(true, 'hello')
    }).to.not.throw(Error)

    expect(() => {
      fn(5, 'hello')
    }).to.not.throw(Error)

    expect(() => {
      fn(() => {}, 'hello')
    }).to.not.throw(Error)
  })

  it('should work with n-dimensional arrays', () => {
    const fn = type(function (a = [Number, [Number, [Number, [Number]]]]) {})

    expect(() => {
      fn([1, [2, [3, [4]]]])
    }).to.not.throw(Error)

    expect(() => {
      fn([1, [2, [3, [true]]]])
    }).to.throw(Error)
  })

  it('should work with n-dimensional objects', () => {
    const fn = type(function (a = {x: {y: {z: Number}}}) {})

    expect(() => {
      fn({x: {y: {z: 5}}})
    }).to.not.throw(Error)

    expect(() => {
      fn({x: {y: {z: true}}})
    }).to.throw(Error)
  })

  it('should work with object aliases', () => {
    typedef(Vector => ({x: Number, y: Number}))

    const mul = type((a = Vector, b = Number) => {
      return { x: a.x * b, y: a.y * b }
    })

    expect(() => {
      return mul({x: 5, y: 3}, 2)
    }).to.not.throw(Error).and.to.equal({ x: 10, y: 6 })

    expect(() => {
      mul({x: 3, y: ';-)'}, 3)
    }).to.throw(Error)
  })

  it('should work with array aliases', () => {
    typedef(SetOfThree => [Number, Number, Number])

    const sumOfThree = type((x = SetOfThree) => {
      return x[0] + x[1] + x[2]
    })

    expect(() => {
      return sumOfThree([3, 2, 1])
    }).to.not.throw(Error).and.to.equal(6)

    expect(() => {
      sumOfThree([3, 2, 'one'])
    }).to.throw(Error)
  })

  it('should work with literal aliases', () => {
    typedef(Num => Number)

    const add = type((a = Num, b = Num) => {
      return a + b
    })

    expect(() => {
      return add(5, 3)
    }).to.not.throw(Error).and.to.equal(8)

    expect(() => {
      return add(5, 'three')
    }).to.throw(Error)
  })

  it('should allow multiplication of a constraint to create a list of length n', () => {
    const sumTen = type((a = [Number * 10]) => {
      return a.reduce((a, b) => a + b, 0)
    })

    expect(() => {
      return sumTen([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    }).to.not.throw(Error).and.to.equal(10)

    expect(() => {
      return sumTen([1, 2, 3])
    }).to.throw(Error)

    expect(() => {
      return sumTen([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    }).to.throw(Error)
  })

  it('should allow \'...\' to create a list of any length > 0', () => {
    let sumN = type((a = [...Number]) => {
      return a.reduce((a, b) => a + b, 0)
    })

    expect(() => {
      return sumN([1, 2, 3])
    }).to.not.throw(Error).and.to.equal(6)

    expect(() => {
      return sumN([])
    }).to.throw(Error)
  })

  it('should allow return types in arrow functions', () => {
    let addR = (a = Number | String, b = Number | String) => String => {
      return a + b
    }

    addR = type(addR)

    expect(() => {
      return addR(5, 'x')
    }).to.not.throw(Error).and.to.equal('5x')

    expect(() => {
      return addR(3, 5)
    }).to.throw(Error)
  })

  it('should allow more complex return types using (_=...) syntax', () => {
    let vec = (x = Any, y = Any) => (_ = {x: Number, y: Number}) => {
      return { x: x, y: y }
    }

    vec = type(vec)

    expect(() => {
      return vec(5, 3)
    }).to.not.throw(Error)

    expect(() => {
      return vec(5, 'x')
    }).to.throw(Error)
  })

  it('should allow aliases to be used as return types', () => {
    typedef(Vector => ({x: Number, y: Number}))

    let vec = (x = Any, y = Any) => Vector => {
      return { x: x, y: y }
    }

    vec = type(vec)

    expect(() => {
      vec(3, 4)
    }).to.not.throw(Error)

    expect(() => {
      vec(3, 'a')
    }).to.throw(Error)
  })

  describe('typeAll', function () {
    it('typeAll should work on an object only containing functions', () => {
      const obj = {
        add: function (x = Number, y = Number) {
          return x + y
        },
        mul: function (x = Number, y = Number) {
          return x * y
        }
      }

      expect(function () {
        typeAll(obj)
      }).to.not.throw(Error)

      expect(obj.add(3, 5)).to.equal(8)
      expect(obj.mul(2, 10)).to.equal(20)

      expect(function () {
        obj.add('a', 1)
      }).to.throw(Error)
    })

    it('typeAll should work on a mix of functions and other values', () => {
      const obj = {
        add: function (x = Number, y = Number) {
          return x + y
        },
        j: 10,
        k: {}
      }

      expect(function () {
        typeAll(obj)
      }).to.not.throw(Error)

      expect(obj.add(3, 5)).to.equal(8)

      expect(function () {
        obj.add('a', 1)
      }).to.throw(Error)
    })
  })
})
