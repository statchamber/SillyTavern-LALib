# LALib

Library of STScript commands.


- Boolean Operations (test, and, or, not)
- List Operations (foreach, map, filter, find, slice, shuffle, dict)
- Split & Join (split, join)
- Text Operations (trim, diff)
- Accessing & Manipulating Structured Data (getat, setat)
- Exception Handling (try, catch)
- Copy & Download (copy, download)
- DOM Interaction (dom)
- Group Chats (memberpos)
- Conditionals - switch (switch, case)
- Conditionals - if (ife, elseif, else, then)
- World Info (wi-list-books, wi-list-entries)
- Costumes / Sprites (costumes)
- Quick Replies (qr-edit, qr-add)
- Chat Messages (swipes-get, swipes-list, swipes-count, swipes-index, swipes-add, swipes-del, swipes-go, message-edit)
- Time & Date (timestamp)
- Async (fireandforget)





## Requirements

- [Costumes Plugin](https://github.com/LenAnderson/SillyTavern-Costumes.git) for `/costumes` command.






## Commands







### Help



#### `/lalib?`
Lists LALib commands

##### Examples

```stscript
/lalib?
```







### Boolean Operations



#### `/test`
`left=val rule=rule right=val`

Returns true or false, depending on whether left and right adhere to rule. Available rules: gt => a > b, gte => a >= b, lt => a < b, lte => a <= b, eq => a == b, neq => a != b, not => !a, in (strings) => a includes b, nin (strings) => a not includes b

##### Examples

```stscript
/setvar key=x 1 |
/setvar key=y 2 |
/test left={{getvar::x}} rule=eq right={{getvar::y}} |
/echo The result will be "false": {{pipe}}
```

```stscript
/setvar key=x 1 |
/setvar key=y 2 |
/test left={{getvar::x}} rule=lt right={{getvar::y}} |
/echo The result will be "true": {{pipe}}
```





#### `/and`
`left=val right=val`

Returns true if both left and right are true, otherwise false.

##### Examples

```stscript
/and left=true right=false |
/echo The result will be "false": {{pipe}}
```

```stscript
/and left=true right=true |
/echo The result will be "true": {{pipe}}
```





#### `/or`
`left=val right=val`

Returns true if at least one of left and right are true, false if both are false.

##### Examples

```stscript
/or left=true right=false |
/echo The result will be "true": {{pipe}}
```

```stscript
/or left=false right=false |
/echo The result will be "false": {{pipe}}
```





#### `/not`
`(value)`

Returns true if value is false, otherwise true.

##### Examples

```stscript
/not true |
/echo The result will be "false": {{pipe}}
```

```stscript
/not false |
/echo The result will be "true": {{pipe}}
```







### List Operations



#### `/foreach`
`[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})`

Executes command for each item of a list or dictionary.

##### Examples

```stscript
/setvar key=x ["A", "B", "C"] |
/foreach var=x
    /echo Item {{index}} is {{item}} \|
    /delay 400
```

```stscript
/foreach list={"a":"foo","b":"bar"}
    /echo Item {{index}} is {{item}} \|
    /delay 400
```





#### `/map`
`[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})`

Executes command for each item of a list or dictionary and returns the list or dictionary of the command results.

##### Examples

```stscript
/setvar key=x [1,2,3] |
/map var=x
    /mul {{item}} {{item}}
|
/echo Squares: {{pipe}}
```

```stscript
/map list={"a":"foo","b":"bar"}
    /return This is item {{index}} with value {{item}}
|
/echo
```





#### `/filter`
`[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})`

Executes command for each item of a list or dictionary and returns the list or dictionary of only those items where the command returned true.

##### Examples

```stscript
/setvar key=x [1,2,3,4,5,6,7,8,9,10] |
/filter var=x
    /mod {{item}} 2 \|
    /test left=\{\{pipe\}\} rule=eq right=0
|
/echo Only even numbers: {{pipe}}
```

```stscript
/filter list={"a":"foo","b":"bar"}
    /test left={{item}} rule=in right=a
|
/echo Only items that include an "a": {{pipe}}
```





#### `/find`
`[optional list=[1,2,3]] [optional var=varname] [optional globalvar=globalvarname] (/command {{item}} {{index}})`

Executes command for each item of a list or dictionary and returns the first item where the command returned true.

##### Examples

```stscript
/setvar key=x [2,4,6,8,10] |
/find var=x
    /test left={{item}} rule=gt right=5
|
/echo The first item greater than 5: {{pipe}}
```

```stscript
/find list={"a":"foo","b":"bar","c":"foobar","d":"barfoo"}
    /len {{item}} \|
    /test left=\{\{pipe\}\} rule=gt right=3
|
/echo The first item longer than 3 characters: {{pipe}}
```





#### `/slice`
`start=int [optional end=int] [optional length=int] [optional var=varname] [optional globalvar=globalvarname] (optional value)`

Retrieves a slice of a list or string.

##### Examples

```stscript
/setvar key=x [1,2,3,4,5] |
/slice var=x start=2 |
/echo The result will be "[3,4,5]": {{pipe}}
```

```stscript
/slice start=-3 foo bar |
/echo The result will be "bar": {{pipe}}
```





#### `/shuffle`
`(list to shuffle)`

Returns a shuffled list.

##### Examples

```stscript
/shuffle [1,2,3,4,5] |
/echo
```





#### `/dict`
`[optional var=varname] [optional globalvar=globalvarname] (list of lists)`

Takes a list of lists (each item must be a list of at least two items) and creates a dictionary by using each items first item as key and each items second item as value.

##### Examples

```stscript
/setvar key=x [
    ["a", 1],
    ["b", 2],
    ["c", 3]
] |
/dict var=x |
/echo
```







### Split & Join



#### `/split`
`[optional find=","] [optional trim=true|false] [optional var=varname] [optional globalvar=globalvarname] (value)`

Splits value into list at every occurrence of find. Supports regex <code>find=/\\s/</code>

##### Examples

```stscript
/split foo, bar |
/echo The result will be ["foo", "bar"]: {{pipe}}
```

```stscript
/split find=/o.+?o/g The quick brown fox jumps over the lazy dog. |
/echo The result will be ["The quick br", "x jumps", "g."]: {{pipe}}
```





#### `/join`
`[optional glue=", "] [optional var=varname] [optional globalvar=globalvarname] (optional list)`

Joins the items of a list with glue into a single string. Use <code>glue={{space}}</code> to join with a space.

##### Examples

```stscript
/setvar key=x ["a","b","c"] |
/join var=x |
/echo The result will be "a, b, c": {{pipe}}
```

```stscript
/join glue=::: ["foo", "bar"] |
/echo The result will be "foo:::bar": {{pipe}}
```







### Text Operations



#### `/trim`
`(text to trim)`

Removes whitespace at the start and end of the text.

##### Examples

```stscript
/return [" foo", "bar "] |
/getat index=0 |
/trim |
/echo
```





#### `/diff`
`[optional all=true] [optional buttons=true] [optional stripcode=true] [optional notes=text] [old=oldText] [new=newText]`

Compares old text vs new text and displays the difference between the two. Use <code>all=true</code> to show new, old, and diff side by side. Use <code>buttons=true</code> to add buttons to pick which text to return. Use <code>stripcode=true</code> to remove all codeblocks before diffing. Use <code>notes="some text"</code> to show additional notes or comments above the comparison.

##### Examples

```stscript
/echo comparing the last two messages |

/sub {{lastMessageId}} 1 |
/messages names=off |
/split find=``` |
/getat index=-1 |
/let old {{pipe}} |
/setvar key=old {{var::old}} |

/messages names=off {{lastMessageId}} |
/split find=``` |
/getat index=-1 |
/let new {{pipe}} |
/setvar key=new {{var::new}} |

/diff old={{var::old}} new={{var::new}}
```

```stscript
/diff old="The quick brown fox jumps over the lazy dog." new="The fast spotted fox jumps across the sleeping dog." notes="Foxes and dogs." all=true
```







### Accessing & Manipulating Structured Data



#### `/getat`
`index=int|fieldname|list [optional var=varname] [optional globalvar=globalvarname] (optional value)`

Retrieves an item from a list or a property from a dictionary.

##### Examples

```stscript
/setvar key=x {
    "a": [
        1,
        2,
        {
            "b": "foo",
            "c": "bar"
        }
    ],
    "d": "D"
} |
/getat var=x index=d |
/echo The result will be "D": {{pipe}}
```

```stscript
/return {
    "a": [
        1,
        2,
        {
            "b": "foo",
            "c": "bar"
        }
    ],
    "d": "D"
} |
/getat index=["a", 2, "b"] |
/echo The result will be "foo": {{pipe}}
```

```stscript
/return {
    "a": [
        1,
        2,
        {
            "b": "foo",
            "c": "bar"
        }
    ],
    "d": "D"
} |
/getat index=a |
/getat index=2 |
/getat index=c |
/echo The result will be "bar": {{pipe}}
```





#### `/setat`
`index=int|fieldname|list [optional var=varname] [optional globalvar=globalvarname] [optional value=list|dictionary] (value)`

Sets an item in a list or a property in a dictionary. Example: <code>/setat value=[1,2,3] index=1 X</code> returns <code>[1,"X",3]</code>, <code>/setat var=myVariable index=[1,2,"somePropery"] foobar</code> sets the value of <code>myVariable[1][2].someProperty</code> to "foobar" (the variable will be updated and the resulting value of myVariable will be returned). Can be used to create structures that do not already exist.

##### Examples

```stscript
/setvar key=x {
    "a": [
        1,
        2,
        {
            "b": "foo",
            "c": "bar"
        }
    ],
    "d": "D"
} |
/setat var=x index=d new value for D |
/echo {{getvar::x}}
```

```stscript
/setvar key=x {
    "a": [
        1,
        2,
        {
            "b": "foo",
            "c": "bar"
        }
    ],
    "d": "D"
} |
/setat var=x index=["a", 2, "c"] new value for bar |
/echo {{getvar::x}}
```

```stscript
/flushvar x |
/setat var=x index=["a","b",2] creating new objects or list |
/echo {{getvar::x}}
```







### Exception Handling



#### `/try`
`(command)`

try catch.

##### Examples

```stscript
/echo Try this first while being connected to an LLM, then without a connection. |
/setvar key=myPrompt Say hello! |
/try
	/getvar myPrompt \|
	/gen \{\{pipe}}
|
/catch pipe={{pipe}}
	/echo something went wrong: {{error}} \|
	/return "gen failed :("
|
/echo {{pipe}}
```





#### `/catch`
`[pipe={{pipe}}] (command)`

try catch. You must always set <code>pipe={{pipe}}</code> and /catch must always be called right after /try. Use <code>{{exception}}</code> or <code>{{error}}</code> to get the exception\'s message.

##### Examples

```stscript
see /try
```







### Copy & Download



#### `/copy`
`(value)`

Copies value into clipboard.

##### Examples

```stscript
/copy this text is now in your clipboard
```

```stscript
/copy {{lastMessage}}
```





#### `/download`
`[optional name=filename] [optional ext=extension] (value)`

Downloads value as a text file.

##### Examples

```stscript
/download Let's download this text.
```

```stscript
/download name=TheLastMessage ext=md {{lastMessage}}
```







### DOM Interaction



#### `/dom`
`[action=click|value|property] [optional value=newValue] [optional property=propertyName] [optional attribute=attributeName] (CSS selector)`

Click on an element, change its value, retrieve a property, or retrieve an attribute. To select the targeted element, use CSS selectors. Example: <code>/dom action=click #expandMessageActions</code> or <code>/dom action=value value=0 #avatar_style</code>

##### Examples

```stscript
/dom action=click #fast_ui_mode |
/echo Toggled "No Blur Effect" setting
```

```stscript
/dom action=value value=0 #avatar_style |
/echo Avatar style has been set to "Circle"
```

```stscript
/dom action=property property=value #avatar_style |
/echo Current avatar style: {{pipe}}
```

```stscript
/dom action=attribute attribute=is_system #chat > .mes:last-child |
/echo Is the last message a system message? {{pipe}}
```







### Group Chats



#### `/memberpos`
`(name) (position)`

Move group member to position (index starts with 0).</code>

##### Examples

```stscript
/memberpos Alice 3 |
/echo Alice has been moved to position 3
```







### Conditionals - switch



#### `/switch`
`[optional var=varname] [optional globalvar=globalvarname] (optional value)`

Use with /case.

##### Examples

```stscript
/setvar key=x foo |
/switch var=x |
    /case pipe={{pipe}} value=1 /echo value is one |
    /case pipe={{pipe}} value=foo /echo value is foo |
    /case pipe={{pipe}} value=bar /echo value is bar |
/echo done
```





#### `/case`
`[pipe={{pipe}}] [value=comparisonValue] (/command)`

Execute command and break out of the switch if the value given in /switch matches the value given here.

##### Examples

```stscript
see /switch
```







### Conditionals - if



#### `/ife`
`(/command)`

Use with /then, /elseif, and /else. The provided command must return true or false.

##### Examples

```stscript
/setvar key=x foo |
/ife /test left=x rule=eq right=1 |
    /then pipe={{pipe}} /echo value is one |
/elseif pipe={{pipe}} /test left=x rule=eq right=foo |
    /then pipe={{pipe}} /echo value is foo |
/elseif pipe={{pipe}} /test left=x rule=eq right=bar |
    /then pipe={{pipe}} /echo value is bar |
/else pipe={{pipe}} /echo value is something else
```





#### `/elseif`
`[pipe={{pipe}}] (/command)`

Use with /ife, /then, and /else. The provided command must return true or false.

##### Examples

```stscript
see /ife
```





#### `/else`
`[pipe={{pipe}}] (/command)`

Use with /ife, /elseif, and /then. The provided command will be executed if the previous /if or /elseif was false.

##### Examples

```stscript
see /ife
```





#### `/then`
`[pipe={{pipe}}] (/command)`

Use with /ife, /elseif, and /else. The provided command will be executed if the previous /if or /elseif was true.

##### Examples

```stscript
see /ife
```







### World Info



#### `/wi-list-books`
Get a list of currently active World Info books.

##### Examples

```stscript
/wi-list-books |
/echo The currently active WI books are: {{pipe}}
```





#### `/wi-list-entries`
`[optional flat=true] (optional book name)`

Get a list of World Info entries from currently active books or from the book with the provided name. Use <code>flat=true</code> to list all entries in a flat list instead of a dictionary with entries per book.

##### Examples

```stscript
/wi-list-entries |
/map list={{pipe}}
    /getat index=entries {{item}} \|
    /map list=\{\{pipe\}\}
        /getat index=comment \\{\\{item\\}\\}
|
/echo Overview of WI entries in currently active books: {{pipe}}
```







### Costumes / Sprites



#### `/costumes`
`[optional recurse=false] (folder)`

Get a list of costume / sprite folders, recursive by default.

##### Examples

```stscript
/costumes Alice | /echo Alice's costumes: {{pipe}}
```

```stscript
/costumes Alice/Winter | /echo Alice's winter costumes: {{pipe}}
```

```stscript
/costumes recurse=false Alice | /echo Alice's top-level costumes only: {{pipe}}
```







### Quick Replies



#### `/qr-edit`
`[optional set=qrSetName] [optional label=qrLabel] (optional qrLabel)`

Show the Quick Reply editor. If no QR set is provided, tries to find a QR in one of the active sets.

##### Examples

```stscript
/qr-edit My QR From An Active Set
```

```stscript
/qr-edit set=MyQrSet label=MyQr
```





#### `/qr-add`
`[optional set=qrSetName] [optional label=qrLabel] (optional qrLabel)`

Create a new Quick Reply and open its editor. If no QR set is provided, tries to find a QR in one of the active sets.

##### Examples

```stscript
/qr-add New QR In Active Set
```

```stscript
/qr-add set=MyQrSet label=MyNewQr
```







### Chat Messages



#### `/swipes-get`
`[optional message=messageId] (index)`

Get the n-th swipe (zero-based index) from the last message or the message with the given message ID.

##### Examples

```stscript
/swipes-get 5 |
/echo Swipe number five: {{pipe}}
```

```stscript
/sub {{lastMessageId}} 2 |
/swipes-countget message={{pipe}} 5 |
/echo swipe number five: {{pipe}}
```





#### `/swipes-list`
`[optional message=messageId]`

Get a list of all swipes from the last message or the message with the given message ID.

##### Examples

```stscript
/swipes-list |
/echo
```

```stscript
/sub {{lastMessageId}} 2 |
/swipes-list message={{pipe}} |
/echo
```





#### `/swipes-count`
`[optional message=messageId]`

Get the number of all swipes from the last message or the message with the given message ID.

##### Examples

```stscript
/swipes-count |
/echo
```

```stscript
/sub {{lastMessageId}} 2 |
/swipes-count message={{pipe}} |
/echo
```





#### `/swipes-index`
`[optional message=messageId]`

Get the current swipe index from the last message or the message with the given message ID.

##### Examples

```stscript
/swipes-index |
/echo
```

```stscript
/sub {{lastMessageId}} 2 |
/swipes-index message={{pipe}} |
/echo
```





#### `/swipes-add`
`(message)`

Add a new swipe to the last message.

##### Examples

```stscript
/sendas name=Alice foo |
/delay 1000 |
/swipes-add bar
```





#### `/swipes-del`
`(optional index)`

Delete the current swipe or the swipe at index (0-based).

##### Examples

```stscript
/sendas name=Alice foo |
/delay 1000 |
/swipes-add bar |
/delay 1000 |
/swipes-del
```

```stscript
/sendas name=Alice foo |
/delay 1000 |
/swipes-add bar |
/delay 1000 |
/swipes-add foobar |
/delay 1000 |
/swipes-del 0
```





#### `/swipes-go`
`(index)`

Go to the swipe. 0-based index.

##### Examples

```stscript
/sendas name=Alice foo |
/delay 1000 |
/swipes-add bar |
/delay 1000 |
/swipes-add foobar |
/delay 1000 |
/swipes-go 0
```





#### `/message-edit`
`[optional message=messageId] [optional append=true] (new text)`

Edit the current message or the message at the provided message ID. Use <code>append=true</code> to add the provided text at the end of the message. Use <code>{{space}}</code> to add space at the beginning of the text.

##### Examples

```stscript
/sendas name=Alice foo |
/delay 1000 |
/message-edit bar
```

```stscript
/sendas name=Alice foo |
/delay 1000 |
/message-edit append=true bar
```







### Time & Date



#### `/timestamp`
Returns the number of milliseconds midnight at the beginning of January 1, 1970, UTC.

##### Examples

```stscript
/timestamp |
/echo
```







### Async



#### `/fireandforget`
`(closure|command)`

Execute a closure or command without waiting for it to finish.

##### Examples

```stscript
/fireandforget
    /delay 1000 \|
    /echo firing \|
    /delay 1000 \|
    /echo still firing
|
/echo outside
```







### Undocumented



#### `/fetch`
`(url)`

UNDOCUMENTED

##### Examples

```stscript
/fetch http://example.com |
/echo
```





#### `/$`
`[optional query=cssSelector] [optional take=property] [optional call=property] (html)`

UNDOCUMENTED

##### Examples

```stscript
/fetch http://example.com |
/$ query=h1 take=textContent |
/echo
```





#### `/$$`
`[optional query=cssSelector] [optional take=property] [optional call=property] (html)`

UNDOCUMENTED

##### Examples

```stscript
/fetch http://example.com |
/$$ query=p call=remove |
/echo
```

